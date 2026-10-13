import crypto from "node:crypto";
import { SkipFurtherHooksError } from "@hocuspocus/common";
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
import {
	IncomingMessage,
	isTransactionOrigin,
	MessageReceiver,
	MessageType,
	OutgoingMessage,
} from "@hocuspocus/server";
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
import type { Awareness } from "y-protocols/awareness";
import {
	messageYjsSyncStep1,
	messageYjsSyncStep2,
	messageYjsUpdate,
} from "y-protocols/sync";
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
	 * The maximum time (in ms) to wait for the other instances that have a
	 * document open to send their state, both when loading the document
	 * (`afterLoadDocument`) and in {@link Redis.syncWithPeers}.
	 *
	 * When a document is loaded on this instance while other instances already
	 * have it open (and possibly modified in memory, not yet persisted), we
	 * publish a SyncStep1 and block the load until every one of them has
	 * answered with its state — or this timeout elapses. This guarantees that
	 * callers (most importantly a `DirectConnection`) observe the latest
	 * collaborative state instead of just what was loaded from storage.
	 *
	 * If no other instance is subscribed to the document, the wait is skipped
	 * entirely, so a cold/lone load is not delayed.
	 *
	 * Set to `0` to disable the wait and restore the legacy fire-and-forget
	 * behavior.
	 */
	awaitInitialSyncTimeout: number;
}

/**
 * Publishes for one document, accumulated over a single event loop turn.
 *
 * The two kinds are independent, not alternatives: a turn can carry a sync step,
 * an awareness update, or both, and each is sent on its own.
 */
type PendingPublish = {
	document: Document;

	/** A SyncStep1 is pending. A flag, not a count: state vectors are idempotent. */
	syncStepPending: boolean;

	/** Clients whose awareness changed this turn; empty when none did. */
	awarenessClients: Set<number>;

	/** Set alongside `awarenessClients`; the awareness they belong to. */
	awareness?: Awareness;

	cancel: () => void;
};

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

	/**
	 * Resolves once this instance is subscribed to its own reply channel.
	 * Awaited before a document announces itself, so a peer's reply can never
	 * arrive on a channel we are not listening to yet.
	 */
	private replySubscription: Promise<void>;

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
	 * In-flight waits for peers' state (`afterLoadDocument`, `syncWithPeers`),
	 * keyed by document name. Fed by `handleIncomingMessage`. See
	 * `requestStateFromPeers`.
	 */
	private peerStateWaits = new Map<string, Set<PeerStateWait>>();

	/**
	 * Publishes coalesced into the current event loop turn, keyed by document
	 * name. See `schedulePublish`.
	 */
	private pendingPublishes = new Map<string, PendingPublish>();

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

		// Subscribed once for the lifetime of the extension rather than per
		// document: `handleIncomingMessage` resolves the document from the message
		// payload, so a single channel per instance receives every reply addressed
		// to us. Started here instead of in `onConfigure` because the server does
		// not await that hook; `afterLoadDocument` awaits this promise, so no
		// reply can be missed while the subscription is still pending.
		this.replySubscription = new Promise<void>((resolve, reject) => {
			this.sub.subscribe(
				this.replyKey(this.configuration.identifier),
				(error: any) => {
					if (error) {
						reject(error);
						return;
					}

					resolve();
				},
			);
		});

		// The error is re-thrown to whoever awaits the promise in
		// `afterLoadDocument`; this handler only keeps it from being reported as
		// an unhandled rejection when no document is ever loaded.
		this.replySubscription.catch(() => {});
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

	/**
	 * The channel an instance receives replies to its own requests on.
	 *
	 * Separated from the prefix by `#` rather than `:`, so it can never collide
	 * with the document channel of a document that happens to be named
	 * `reply:<identifier>`.
	 */
	private replyKey(identifier: string) {
		return `${this.configuration.prefix}#reply:${identifier}`;
	}

	private encodeMessage(message: Uint8Array) {
		return Buffer.concat([this.messagePrefix, Buffer.from(message)]);
	}

	private decodeMessage(buffer: Buffer): [identifier: string, message: Buffer] {
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
			// Replies to the SyncStep1 we are about to publish are addressed to
			// this instance's reply channel, so that subscription has to be live
			// first.
			await this.replySubscription;

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

			await this.requestStateFromPeers(documentName, document, {
				queryAwareness: true,
			});
		} catch (error) {
			// Loading failed: stop tracking the document so future messages aren't
			// applied to a doc that never finished loading, release any pending
			// wait, and best-effort unsubscribe (afterUnloadDocument does not run
			// for a load that never completed).
			this.documents.delete(documentName);
			this.releasePeerStateWaits(documentName);
			this.sub.unsubscribe(this.subKey(documentName), () => {});
			throw error;
		}
	}

	/**
	 * Bring a document this instance has loaded up to date with every other
	 * instance that has it open.
	 *
	 * An edit made on another instance reaches a loaded document one sync round
	 * trip later: that instance publishes its state vector, this one asks back,
	 * and the changes follow. Reading straight after an edit made elsewhere can
	 * therefore return the state from before it. `afterLoadDocument` covers
	 * the load; call this before reading or diffing a document that was
	 * already loaded, e.g. when serving an API request. It waits at most
	 * {@link Configuration.awaitInitialSyncTimeout} and returns right away when
	 * no other instance has the document open.
	 */
	public async syncWithPeers(
		documentName: string,
		document: Document,
	): Promise<void> {
		// Only a document this instance is subscribed to is counted among the
		// receivers of our own SyncStep1, and only it can be caught up.
		if (this.documents.get(documentName) !== document) {
			return;
		}

		await this.replySubscription;
		await this.requestStateFromPeers(documentName, document);
	}

	/**
	 * Announce our state to other instances and — when other instances have this
	 * document open — block until every one of them has answered with its state
	 * (or the configured timeout elapses). See
	 * {@link Configuration.awaitInitialSyncTimeout}.
	 *
	 * - **Every peer, not the first.** Only the instance that took an edit may
	 *   have it yet, and another instance that has not heard about it can answer
	 *   first. PUBLISH returns how many subscribers received our SyncStep1,
	 *   which includes this instance, so it tells how many answers to wait for
	 *   without an extra round trip.
	 * - **Only answers to our SyncStep1 count.** A peer answers one as a
	 *   SyncReply with its own state vector, followed by a SyncStep2. A SyncStep2
	 *   on its own answers a SyncReply we sent during a sync the peer started,
	 *   and it may have been computed before the edit we are waiting for.
	 * - **Waits are independent.** Concurrent calls for one document each get
	 *   their own wait.
	 */
	private async requestStateFromPeers(
		documentName: string,
		document: Document,
		{ queryAwareness = false } = {},
	) {
		const timeout = this.configuration.awaitInitialSyncTimeout;

		const announce = () =>
			Promise.all([
				this.publishFirstSyncStep(documentName, document),
				queryAwareness
					? this.requestAwarenessFromOtherInstances(documentName)
					: undefined,
			]);

		if (timeout <= 0) {
			// Awaited so a Redis publish failure surfaces as an error instead of
			// an unhandled rejection.
			await announce();
			return;
		}

		// Registered before publishing, so an answer cannot slip past us.
		const wait = new PeerStateWait();
		let waits = this.peerStateWaits.get(documentName);
		if (!waits) {
			waits = new Set();
			this.peerStateWaits.set(documentName, waits);
		}
		waits.add(wait);

		let timer: ReturnType<typeof setTimeout> | undefined;

		try {
			const [receivers] = await announce();

			// We are subscribed ourselves, so with any other count than at least
			// one (Redis Cluster counts per node) the number of peers is unknown:
			// wait for one answer, bounded by the timeout.
			wait.expect(receivers >= 1 ? receivers - 1 : 1);

			await Promise.race([
				wait.done,
				new Promise<void>((resolve) => {
					timer = setTimeout(resolve, timeout);
				}),
			]);
		} finally {
			clearTimeout(timer);
			waits.delete(wait);
			if (waits.size === 0) {
				this.peerStateWaits.delete(documentName);
			}
		}
	}

	/**
	 * Release every wait for a document, e.g. because it is unloaded.
	 */
	private releasePeerStateWaits(documentName: string) {
		for (const wait of this.peerStateWaits.get(documentName) ?? []) {
			wait.release();
		}
		this.peerStateWaits.delete(documentName);
	}

	/**
	 * Classify a message that arrived on our reply channel without consuming
	 * the decoder: a peer's state vector (the SyncReply that opens its answer to
	 * our SyncStep1) or its state (SyncStep2 or Update). Anything else does not
	 * count towards a wait.
	 */
	private peekPeerAnswer(
		message: IncomingMessage,
	): "stateVector" | "state" | null {
		const { pos } = message.decoder;
		try {
			const type = message.readVarUint();
			if (type !== MessageType.Sync && type !== MessageType.SyncReply) {
				return null;
			}
			const syncType = message.readVarUint();
			if (type === MessageType.SyncReply && syncType === messageYjsSyncStep1) {
				return "stateVector";
			}
			return syncType === messageYjsSyncStep2 || syncType === messageYjsUpdate
				? "state"
				: null;
		} catch {
			return null;
		} finally {
			message.decoder.pos = pos;
		}
	}

	/**
	 * Coalesce this document's Redis publishes into the current event loop turn.
	 *
	 * Both publishers are per-change and neither is covered by the server's
	 * `flushDelay` batching: `onChange` runs synchronously by design (it also
	 * drives the store hooks) and `onAwarenessUpdate` is dispatched from a raw
	 * awareness listener rather than from `Document`'s batched broadcast. Left
	 * uncoalesced, a document with many writing clients publishes one SyncStep1
	 * per change and every peer answers each one with a full
	 * `encodeStateAsUpdate` diff — which is O(document), so this costs far more
	 * per change than the WebSocket fan-out ever did.
	 *
	 * Collapsing is lossless. A SyncStep1 carries the document's *current* state
	 * vector, so the last one of a turn is a superset of the ones it replaces
	 * and a peer's reply to it covers every skipped change. Awareness collapses
	 * to the latest state of each changed client, exactly as `Document` does for
	 * its own fan-out.
	 */
	private schedulePublish(
		documentName: string,
		document: Document,
	): PendingPublish {
		const existing = this.pendingPublishes.get(documentName);

		if (existing) {
			if (existing.document === document) {
				return existing;
			}

			// The document was reloaded under the same name. `afterUnloadDocument`
			// returns early on a fast reconnect, so it cannot be relied on to have
			// cleared this. Whatever is buffered describes the previous instance —
			// its state vector and its awareness — so drop it rather than publish
			// it on behalf of the new one.
			existing.cancel();
			this.pendingPublishes.delete(documentName);
		}

		const handle = setImmediate(() => {
			this.flushPublish(documentName).catch((error) => {
				console.error(
					`Redis: failed to publish for document "${documentName}"`,
					error,
				);
			});
		});

		const pending: PendingPublish = {
			document,
			syncStepPending: false,
			awarenessClients: new Set<number>(),
			cancel: () => clearImmediate(handle),
		};

		this.pendingPublishes.set(documentName, pending);

		return pending;
	}

	private cancelPendingPublish(documentName: string) {
		const pending = this.pendingPublishes.get(documentName);

		if (pending) {
			pending.cancel();
			this.pendingPublishes.delete(documentName);
		}
	}

	/**
	 * Send everything accumulated for this document in the current turn.
	 */
	private async flushPublish(documentName: string) {
		const pending = this.pendingPublishes.get(documentName);

		if (!pending) {
			return;
		}

		this.pendingPublishes.delete(documentName);

		// Both are issued before anything is awaited, so a failing sync step
		// cannot swallow the awareness update — the entry is already dropped from
		// the map at this point, and those clients would never be retried.
		const publishes: Array<Promise<unknown>> = [];

		if (pending.syncStepPending) {
			publishes.push(this.publishFirstSyncStep(documentName, pending.document));
		}

		// Same guard as the uncoalesced path: publishing awareness for a document
		// nobody is connected to throws (see hocuspocus#1027).
		if (
			pending.awarenessClients.size > 0 &&
			pending.awareness &&
			pending.document.connections.size > 0
		) {
			const message = new OutgoingMessage(
				documentName,
			).createAwarenessUpdateMessage(
				pending.awareness,
				Array.from(pending.awarenessClients),
			);

			publishes.push(
				this.pub.publish(
					this.pubKey(documentName),
					this.encodeMessage(message.toUint8Array()),
				),
			);
		}

		await Promise.all(publishes);
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
				throw new SkipFurtherHooksError(
					"Another instance is already storing this document",
				);
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

		const pending = this.schedulePublish(documentName, document);

		pending.awareness = awareness;

		for (const clientId of added.concat(updated, removed)) {
			pending.awarenessClients.add(clientId);
		}
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

		// State that reached us on our own reply channel was computed for our
		// state vector; state overheard anywhere else was computed for somebody
		// else and says nothing about whether we have caught up.
		const addressedToUs =
			channel.toString("utf-8") ===
			this.replyKey(this.configuration.identifier);
		const peerAnswer = addressedToUs ? this.peekPeerAnswer(message) : null;

		const receiver = new MessageReceiver(message, this.redisTransactionOrigin);
		await receiver.apply(document, undefined, (reply) => {
			// Replies go to the requester alone, never to the document channel.
			// A SyncStep2 is `encodeStateAsUpdate(document, requesterStateVector)`:
			// the structs that one requester is missing plus the *entire* delete
			// set. An instance whose state is behind the requester's applies those
			// deletes without receiving the structs that replaced the deleted
			// content, leaving it with a document that never existed — which it
			// then broadcasts to its own clients and can persist (#1151).
			return this.pub.publish(
				this.replyKey(identifier),
				this.encodeMessage(reply),
			);
		});

		// Only after the message was applied: a wait released by a peer's state
		// must find that state in the document.
		if (peerAnswer) {
			for (const wait of this.peerStateWaits.get(documentName) ?? []) {
				wait.receive(identifier, peerAnswer);
			}
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

		this.schedulePublish(data.documentName, data.document).syncStepPending =
			true;
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

		this.releasePeerStateWaits(data.documentName);
		this.documents.delete(data.documentName);
		// Nothing should be pending: the coalescing window is a single event loop
		// turn and `beforeUnloadDocument` already waits `disconnectDelay` to let
		// syncs finish. This is a safety net so a timer cannot fire against a
		// document that is on its way out.
		this.cancelPendingPublish(data.documentName);

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
		// Cancelled rather than flushed, because flushing could not achieve
		// anything: a pending publish is a SyncStep1, i.e. a state vector, which
		// only *asks* peers to reply. Our own changes reach them one round trip
		// later, when we answer the SyncStep1 they send back — and the subscriber
		// is disconnected a few lines below, so that answer would never come.
		// Durability on shutdown comes from the fact that we flush per setImmediate,
		// which runs before the delay in beforeUnloadDocument.
		for (const documentName of Array.from(this.pendingPublishes.keys())) {
			this.cancelPendingPublish(documentName);
		}

		await this.redlock.quit();
		this.pub.disconnect(false);
		this.sub.disconnect(false);
	}
}

/**
 * One wait for the other instances' answers to a SyncStep1 we published. See
 * `Redis.requestStateFromPeers`.
 */
class PeerStateWait {
	private expected = Number.POSITIVE_INFINITY;

	/** Peers whose state vector arrived, i.e. whose answer has begun. */
	private answering = new Set<string>();

	private answered = new Set<string>();

	public release: () => void = () => {};

	public readonly done = new Promise<void>((resolve) => {
		this.release = resolve;
	});

	/** Set once PUBLISH has told how many peers received the SyncStep1. */
	expect(peers: number) {
		this.expected = peers;
		this.releaseIfComplete();
	}

	receive(identifier: string, answer: "stateVector" | "state") {
		if (answer === "stateVector") {
			this.answering.add(identifier);
			return;
		}

		if (this.answering.delete(identifier)) {
			this.answered.add(identifier);
			this.releaseIfComplete();
		}
	}

	private releaseIfComplete() {
		if (this.answered.size >= this.expected) {
			this.release();
		}
	}
}
