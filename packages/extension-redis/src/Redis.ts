import crypto from "node:crypto";
import type {
	afterLoadDocumentPayload,
	afterStoreDocumentPayload,
	afterUnloadDocumentPayload,
	beforeBroadcastStatelessPayload,
	beforeUnloadDocumentPayload,
	Document,
	Extension,
	Hocuspocus,
	onAwarenessUpdatePayload,
	onChangePayload,
	onConfigurePayload,
	onStoreDocumentPayload,
	RedisTransactionOrigin,
} from "@hocuspocus/server";
import { SkipFurtherHooksError } from "@hocuspocus/common";
import {
	IncomingMessage,
	isTransactionOrigin,
	MessageReceiver,
	MessageType,
	OutgoingMessage,
} from "@hocuspocus/server";
import {
	messageYjsSyncStep2,
	messageYjsUpdate,
} from "y-protocols/sync";
import {
	ExecutionError,
	type ExecutionResult,
	type Lock,
	Redlock,
} from "@sesamecare-oss/redlock";
import type {
	Cluster,
	ClusterNode,
	ClusterOptions,
	RedisOptions,
} from "ioredis";
import RedisClient from "ioredis";
export type RedisInstance = RedisClient | Cluster;
export interface Configuration {
	/**
	 * Redis port
	 */
	port: number;
	/**
	 * Redis host
	 */
	host: string;
	/**
	 * Redis Cluster
	 */
	nodes?: ClusterNode[];
	/**
	 * Duplicate from an existed Redis instance
	 */
	redis?: RedisInstance;
	/**
	 * Redis instance creator
	 */
	createClient?: () => RedisInstance;
	/**
	 * Options passed directly to Redis constructor
	 *
	 * https://github.com/luin/ioredis/blob/master/API.md#new-redisport-host-options
	 */
	options?: ClusterOptions | RedisOptions;
	/**
	 * An unique instance name, required to filter messages in Redis.
	 * If none is provided an unique id is generated.
	 */
	identifier: string;
	/**
	 * Namespace for Redis keys, if none is provided 'hocuspocus' is used
	 */
	prefix: string;
	/**
	 * The maximum time for the Redis lock in ms (in case it can’t be released).
	 */
	lockTimeout: number;
	/**
	 * A delay before onDisconnect is executed. This allows last minute updates'
	 * sync messages to be received by the subscription before it's closed.
	 */
	disconnectDelay: number;
	/**
	 * The maximum time (in ms) `afterLoadDocument` waits for another instance to
	 * send its state when loading a document that is already open elsewhere.
	 *
	 * When a document is loaded on this instance while another instance already
	 * has it open (and possibly modified in memory, not yet persisted), we
	 * publish a SyncStep1 and block the load until the peer replies with its
	 * state (SyncStep2) — or this timeout elapses. This guarantees that callers
	 * (most importantly a `DirectConnection`) observe the latest collaborative
	 * state instead of just what was loaded from storage.
	 *
	 * If no other instance is subscribed to the document, the wait is skipped
	 * entirely, so a cold/lone load is not delayed.
	 *
	 * Set to `0` to disable the wait and restore the legacy fire-and-forget
	 * behavior.
	 */
	awaitInitialSyncTimeout: number;
}

export class Redis implements Extension {
	/**
	 * Make sure to give that extension a higher priority, so
	 * the `onStoreDocument` hook is able to intercept the chain,
	 * before documents are stored to the database.
	 */
	priority = 1000;

	configuration: Configuration = {
		port: 6379,
		host: "127.0.0.1",
		prefix: "hocuspocus",
		identifier: `host-${crypto.randomUUID()}`,
		lockTimeout: 1000,
		disconnectDelay: 1000,
		awaitInitialSyncTimeout: 1000,
	};

	redisTransactionOrigin: RedisTransactionOrigin = {
		source: "redis",
	};

	pub: RedisInstance;

	sub: RedisInstance;

	instance!: Hocuspocus;

	redlock: Redlock;

	locks = new Map<string, { lock: Lock; release?: Promise<ExecutionResult> }>();

	messagePrefix: Buffer;

	private pendingAfterStoreDocumentResolves = new Map<
		string,
		{ timeout: NodeJS.Timeout; resolve: () => void }
	>();

	/**
	 * Documents this instance has loaded and subscribed to, keyed by name.
	 *
	 * This mirrors `instance.documents` but is populated at the very start of
	 * `afterLoadDocument` — i.e. *before* Hocuspocus registers the document in
	 * `instance.documents` (which only happens once loading, including this
	 * hook, has fully resolved). That early registration is what lets
	 * `handleIncomingMessage` apply a peer's SyncStep2 reply while we are still
	 * blocking the load on it.
	 */
	private documents = new Map<string, Document>();

	/**
	 * Resolvers for in-flight `afterLoadDocument` waits, keyed by document name.
	 * Invoked by `handleIncomingMessage` as soon as a peer's state arrives.
	 */
	private pendingInitialSyncResolves = new Map<string, () => void>();

	public constructor(configuration: Partial<Configuration>) {
		this.configuration = {
			...this.configuration,
			...configuration,
		};

		// Create Redis instance
		const { port, host, options, nodes, redis, createClient } =
			this.configuration;

		if (typeof createClient === "function") {
			this.pub = createClient();
			this.sub = createClient();
		} else if (redis) {
			this.pub = redis.duplicate();
			this.sub = redis.duplicate();
		} else if (nodes && nodes.length > 0) {
			this.pub = new RedisClient.Cluster(nodes, options);
			this.sub = new RedisClient.Cluster(nodes, options);
		} else {
			this.pub = new RedisClient(port, host, options ?? {});
			this.sub = new RedisClient(port, host, options ?? {});
		}

		this.sub.on("messageBuffer", this.handleIncomingMessage);

		this.redlock = new Redlock([this.pub], {
			retryCount: 0,
		});

		const identifierBuffer = Buffer.from(
			this.configuration.identifier,
			"utf-8",
		);
		this.messagePrefix = Buffer.concat([
			Buffer.from([identifierBuffer.length]),
			identifierBuffer,
		]);
	}

	async onConfigure({ instance }: onConfigurePayload) {
		this.instance = instance;
	}

	private getKey(documentName: string) {
		return `${this.configuration.prefix}:${documentName}`;
	}

	private pubKey(documentName: string) {
		return this.getKey(documentName);
	}

	private subKey(documentName: string) {
		return this.getKey(documentName);
	}

	private lockKey(documentName: string) {
		return `${this.getKey(documentName)}:lock`;
	}

	private encodeMessage(message: Uint8Array) {
		return Buffer.concat([this.messagePrefix, Buffer.from(message)]);
	}

	private decodeMessage(buffer: Buffer) {
		const identifierLength = buffer[0];
		const identifier = buffer.toString("utf-8", 1, identifierLength + 1);

		return [identifier, buffer.slice(identifierLength + 1)];
	}

	/**
	 * Once a document is loaded, subscribe to the channel in Redis.
	 */
	public async afterLoadDocument({
		documentName,
		document,
	}: afterLoadDocumentPayload) {
		// Track the document locally right away so `handleIncomingMessage` can
		// apply inbound messages to it even before Hocuspocus has finished
		// loading it (it only lands in `instance.documents` after this hook
		// resolves). Without this, the SyncStep2 reply we request below would be
		// dropped while we wait for it.
		this.documents.set(documentName, document);

		try {
			await new Promise<void>((resolve, reject) => {
				// On document creation the node will connect to pub and sub channels
				// for the document.
				this.sub.subscribe(this.subKey(documentName), (error: any) => {
					if (error) {
						reject(error);
						return;
					}

					resolve();
				});
			});

			await this.syncInitialStateFromPeers(documentName, document);
		} catch (error) {
			// Loading failed: stop tracking the document so future messages aren't
			// applied to a doc that never finished loading, release any pending
			// wait, and best-effort unsubscribe (afterUnloadDocument does not run
			// for a load that never completed).
			this.documents.delete(documentName);
			this.pendingInitialSyncResolves.delete(documentName);
			this.sub.unsubscribe(this.subKey(documentName), () => {});
			throw error;
		}
	}

	/**
	 * Announce our state to other instances and — when another instance already
	 * has this document open — block until it has sent us its state (or the
	 * configured timeout elapses). See {@link Configuration.awaitInitialSyncTimeout}.
	 */
	private async syncInitialStateFromPeers(
		documentName: string,
		document: Document,
	) {
		const timeout = this.configuration.awaitInitialSyncTimeout;

		const waitForPeers =
			timeout > 0 && (await this.hasOtherSubscribers(documentName));

		// Announce our state and request awareness. Awaited so a Redis publish
		// failure surfaces as a load error instead of an unhandled rejection.
		await Promise.all([
			this.publishFirstSyncStep(documentName, document),
			this.requestAwarenessFromOtherInstances(documentName),
		]);

		// Skip the wait when it's disabled or nobody else has the document open:
		// there is no peer to sync from, so blocking would only add latency.
		if (!waitForPeers) {
			return;
		}

		// A peer has the document open. Block until it replies with its state
		// (a SyncStep2/Update applied via handleIncomingMessage resolves this) or
		// the timeout elapses. The reply cannot arrive before the SyncStep1 we
		// just published is delivered, so registering the resolver now — right
		// after the awaited publish, before yielding to the event loop — cannot
		// miss it.
		await new Promise<void>((resolve) => {
			const timer = setTimeout(() => {
				this.pendingInitialSyncResolves.delete(documentName);
				resolve();
			}, timeout);

			this.pendingInitialSyncResolves.set(documentName, () => {
				clearTimeout(timer);
				this.pendingInitialSyncResolves.delete(documentName);
				resolve();
			});
		});
	}

	/**
	 * Whether another instance is currently subscribed to a document's channel.
	 * We are subscribed ourselves, so a subscriber count greater than one means
	 * at least one peer has the document open.
	 */
	private async hasOtherSubscribers(documentName: string): Promise<boolean> {
		try {
			const result = (await this.pub.pubsub(
				"NUMSUB",
				this.subKey(documentName),
			)) as [string, number | string];
			return Number(result?.[1] ?? 0) > 1;
		} catch {
			// NUMSUB may be unavailable in some setups (e.g. certain clusters).
			// Assume peers might exist so correctness is preserved; the timeout
			// still bounds the wait.
			return true;
		}
	}

	/**
	 * Resolve a pending `afterLoadDocument` wait once a peer's state has been
	 * applied.
	 */
	private resolveInitialSync(documentName: string) {
		this.pendingInitialSyncResolves.get(documentName)?.();
	}

	/**
	 * Peek whether a message carries another instance's document state
	 * (SyncStep2 or Update) without consuming the decoder. A SyncStep1 only
	 * *requests* state, so it must not release an initial-sync wait.
	 */
	private messageCarriesPeerState(message: IncomingMessage): boolean {
		const { pos } = message.decoder;
		try {
			const type = message.readVarUint();
			if (type !== MessageType.Sync && type !== MessageType.SyncReply) {
				return false;
			}
			const syncType = message.readVarUint();
			return (
				syncType === messageYjsSyncStep2 || syncType === messageYjsUpdate
			);
		} catch {
			return false;
		} finally {
			message.decoder.pos = pos;
		}
	}

	/**
	 * Publish the first sync step through Redis.
	 */
	private async publishFirstSyncStep(documentName: string, document: Document) {
		const syncMessage = new OutgoingMessage(documentName)
			.createSyncMessage()
			.writeFirstSyncStepFor(document);

		return this.pub.publish(
			this.pubKey(documentName),
			this.encodeMessage(syncMessage.toUint8Array()),
		);
	}

	/**
	 * Let’s ask Redis who is connected already.
	 */
	private async requestAwarenessFromOtherInstances(documentName: string) {
		const awarenessMessage = new OutgoingMessage(
			documentName,
		).writeQueryAwareness();

		return this.pub.publish(
			this.pubKey(documentName),
			this.encodeMessage(awarenessMessage.toUint8Array()),
		);
	}

	/**
	 * Before the document is stored, make sure to set a lock in Redis.
	 * That’s meant to avoid conflicts with other instances trying to store the document.
	 */
	async onStoreDocument({ documentName }: onStoreDocumentPayload) {
		// Attempt to acquire a lock and read lastReceivedTimestamp from Redis,
		// to avoid conflict with other instances storing the same document.
		const resource = this.lockKey(documentName);
		const ttl = this.configuration.lockTimeout;
		try {
			const lock = await this.redlock.acquire([resource], ttl);
			const oldLock = this.locks.get(resource);
			if (oldLock?.release) {
				await oldLock.release;
			}
			this.locks.set(resource, { lock });
		} catch (error: any) {
			//based on: https://github.com/sesamecare/redlock/blob/508e00dcd1e4d2bc6373ce455f4fe847e98a9aab/src/index.ts#L347-L349
			if (
				error instanceof ExecutionError &&
				error.message ===
					"The operation was unable to achieve a quorum during its retry window."
			) {
				// Expected behavior: Could not acquire lock, another instance locked it already.
				// Skip further hooks and retry — the data is safe on the other instance.
				throw new SkipFurtherHooksError("Another instance is already storing this document");
			}
			//unexpected error
			console.error("unexpected error:", error);
			throw error;
		}
	}

	/**
	 * Release the Redis lock, so other instances can store documents.
	 */
	async afterStoreDocument({
		documentName,
		lastTransactionOrigin,
	}: afterStoreDocumentPayload) {
		const lockKey = this.lockKey(documentName);
		const lock = this.locks.get(lockKey);
		if (lock) {
			try {
				// Always try to unlock and clean up the lock
				lock.release = lock.lock.release();
				await lock.release;
			} catch {
				// Lock will expire on its own after timeout
			} finally {
				this.locks.delete(lockKey);
			}
		}

		// if the change was initiated by a directConnection (or otherwise local source), we need to delay this hook to make sure sync can finish first.
		// for provider connections, this usually happens in the onDisconnect hook
		if (
			isTransactionOrigin(lastTransactionOrigin) &&
			lastTransactionOrigin.source === "local"
		) {
			const pending = this.pendingAfterStoreDocumentResolves.get(documentName);

			if (pending) {
				clearTimeout(pending.timeout);
				pending.resolve();
				this.pendingAfterStoreDocumentResolves.delete(documentName);
			}

			let resolveFunction: () => void = () => {};
			const delayedPromise = new Promise<void>((resolve) => {
				resolveFunction = resolve;
			});

			const timeout = setTimeout(() => {
				this.pendingAfterStoreDocumentResolves.delete(documentName);
				resolveFunction();
			}, this.configuration.disconnectDelay);

			this.pendingAfterStoreDocumentResolves.set(documentName, {
				timeout,
				resolve: resolveFunction,
			});

			await delayedPromise;
		}
	}

	/**
	 * Handle awareness update messages received directly by this Hocuspocus instance.
	 */
	async onAwarenessUpdate({
		documentName,
		awareness,
		added,
		updated,
		removed,
		document,
	}: onAwarenessUpdatePayload) {
		// Do not publish if there is no connection: it fixes this issue: "https://github.com/ueberdosis/hocuspocus/issues/1027"
		const connections = document?.connections.size || 0;
		if (connections === 0) {
			return; // avoids exception
		}
		const changedClients = added.concat(updated, removed);
		const message = new OutgoingMessage(
			documentName,
		).createAwarenessUpdateMessage(awareness, changedClients);

		return this.pub.publish(
			this.pubKey(documentName),
			this.encodeMessage(message.toUint8Array()),
		);
	}

	/**
	 * Handle incoming messages published on subscribed document channels.
	 * Note that this will also include messages from ourselves as it is not possible
	 * in Redis to filter these.
	 */
	private handleIncomingMessage = async (channel: Buffer, data: Buffer) => {
		const [identifier, messageBuffer] = this.decodeMessage(data);

		if (identifier === this.configuration.identifier) {
			return;
		}

		const message = new IncomingMessage(messageBuffer);
		const documentName = message.readVarString();
		message.writeVarString(documentName);

		// Prefer the extension-local map: it also contains documents that are
		// still loading (not yet in `instance.documents`), which is exactly when
		// a blocking `afterLoadDocument` needs to receive the peer's reply.
		const document =
			this.documents.get(documentName) ??
			this.instance.documents.get(documentName);

		if (!document) {
			return;
		}

		const carriesPeerState = this.messageCarriesPeerState(message);

		const receiver = new MessageReceiver(message, this.redisTransactionOrigin);
		await receiver.apply(document, undefined, (reply) => {
			return this.pub.publish(
				this.pubKey(document.name),
				this.encodeMessage(reply),
			);
		});

		// A peer answered our SyncStep1 with its state — the document has now
		// caught up, so any blocking initial-sync wait can be released.
		if (carriesPeerState) {
			this.resolveInitialSync(documentName);
		}
	};

	/**
	 * if the ydoc changed, we'll need to inform other Hocuspocus servers about it.
	 */
	public async onChange(data: onChangePayload): Promise<any> {
		if (
			isTransactionOrigin(data.transactionOrigin) &&
			data.transactionOrigin.source === "redis"
		) {
			return;
		}

		return this.publishFirstSyncStep(data.documentName, data.document);
	}

	/**
	 * Delay unloading to allow syncs to finish
	 */
	async beforeUnloadDocument(data: beforeUnloadDocumentPayload) {
		return new Promise<void>((resolve) => {
			setTimeout(() => {
				resolve();
			}, this.configuration.disconnectDelay);
		});
	}

	async afterUnloadDocument(data: afterUnloadDocumentPayload) {
		if (data.instance.documents.has(data.documentName)) return; // skip unsubscribe if the document is already loaded again (maybe fast reconnect)

		this.resolveInitialSync(data.documentName);
		this.documents.delete(data.documentName);

		this.sub.unsubscribe(this.subKey(data.documentName), (error: any) => {
			if (error) {
				console.error(error);
			}
		});
	}

	async beforeBroadcastStateless(data: beforeBroadcastStatelessPayload) {
		const message = new OutgoingMessage(
			data.documentName,
		).writeBroadcastStateless(data.payload);

		return this.pub.publish(
			this.pubKey(data.documentName),
			this.encodeMessage(message.toUint8Array()),
		);
	}

	/**
	 * Kill the Redlock connection immediately.
	 */
	async onDestroy() {
		await this.redlock.quit();
		this.pub.disconnect(false);
		this.sub.disconnect(false);
	}
}
