import { Mutex } from "async-mutex";
import {
	Awareness,
	applyAwarenessUpdate,
	removeAwarenessStates,
} from "y-protocols/awareness";
import { applyUpdate, Doc, encodeStateAsUpdate, mergeUpdates } from "yjs";
import type Connection from "./Connection.ts";
import { OutgoingMessage } from "./OutgoingMessage.ts";
import type {
	AwarenessUpdate,
	ConnectionTransactionOrigin,
	FlushOptions,
	TransactionOrigin,
} from "./types.ts";
import { isTransactionOrigin } from "./types.ts";

export class Document extends Doc {
	awareness: Awareness;

	callbacks = {
		// eslint-disable-next-line @typescript-eslint/no-empty-function
		onUpdate: (document: Document, origin: unknown, update: Uint8Array) => {},
		beforeBroadcastStateless: (document: Document, stateless: string) => {},
		beforeHandleAwareness: (
			document: Document,
			states: Map<number, Record<string, any>>,
			transactionOrigin: unknown,
		) => Promise.resolve(),
	};

	connections: Map<
		Connection,
		{
			clients: Set<any>;
		}
	> = new Map();

	// The number of direct (non-websocket) connections to this document
	directConnectionsCount = 0;

	name: string;

	isLoading: boolean;

	isDestroyed = false;

	saveMutex = new Mutex();

	lastChangeTime = 0;

	/**
	 * Batch outgoing broadcasts over this window (ms), or false to send each one
	 * immediately. See `scheduleFlush`.
	 */
	flushDelay: FlushOptions["flushDelay"];

	/**
	 * Flush early once this many bytes of document updates are buffered.
	 */
	flushMaxBytes: FlushOptions["flushMaxBytes"];

	private pendingUpdates: Array<Uint8Array> = [];

	private pendingUpdateBytes = 0;

	private pendingAwarenessClients: Set<number> = new Set();

	private cancelFlush: (() => void) | null = null;

	/**
	 * Constructor.
	 */
	constructor(
		name: string,
		yDocOptions?: object,
		options?: Partial<FlushOptions>,
	) {
		super(yDocOptions);

		this.name = name;
		this.flushDelay = options?.flushDelay ?? 0;
		this.flushMaxBytes = options?.flushMaxBytes ?? 1024 * 1024;

		this.awareness = new Awareness(this);
		this.awareness.setLocalState(null);

		this.awareness.on("update", this.handleAwarenessUpdate.bind(this));
		this.on("update", this.handleUpdate.bind(this));

		this.isLoading = true;
	}

	/**
	 * Check if the Document (XMLFragment or Map) is empty
	 */
	isEmpty(fieldName: string): boolean {
		return !this.get(fieldName)._start && !this.get(fieldName)._map.size;
	}

	/**
	 * Merge the given document(s) into this one
	 */
	merge(documents: Doc | Array<Doc>): Document {
		(Array.isArray(documents) ? documents : [documents]).forEach((document) => {
			applyUpdate(this, encodeStateAsUpdate(document));
		});

		return this;
	}

	/**
	 * Set a callback that will be triggered when the document is updated
	 */
	onUpdate(
		callback: (document: Document, origin: unknown, update: Uint8Array) => void,
	): Document {
		this.callbacks.onUpdate = callback;

		return this;
	}

	/**
	 * Set a callback that will be triggered before a stateless message is broadcasted
	 */
	beforeBroadcastStateless(
		callback: (document: Document, stateless: string) => void,
	): Document {
		this.callbacks.beforeBroadcastStateless = callback;

		return this;
	}

	/**
	 * Set a callback that will be triggered before an inbound awareness update
	 * is applied to this document's awareness state. The callback receives the
	 * document, the decoded per-client states as a mutable `Map`, and the
	 * `TransactionOrigin` that will be forwarded to `applyAwarenessUpdate`.
	 * Use `isTransactionOrigin(origin)` to discriminate sources. Mutate the
	 * map in place (set/delete/field changes) to rewrite the update, or throw
	 * to reject it entirely.
	 */
	beforeHandleAwareness(
		callback: (
			document: Document,
			states: Map<number, Record<string, any>>,
			transactionOrigin: unknown,
		) => Promise<any>,
	): Document {
		this.callbacks.beforeHandleAwareness = callback;

		return this;
	}

	/**
	 * Register a connection and a set of clients on this document keyed by the
	 * underlying websocket connection
	 */
	addConnection(connection: Connection): Document {
		this.connections.set(connection, {
			clients: new Set(),
		});

		return this;
	}

	/**
	 * Is the given connection registered on this document
	 */
	hasConnection(connection: Connection): boolean {
		return this.connections.has(connection);
	}

	/**
	 * Remove the given connection from this document
	 */
	removeConnection(connection: Connection): Document {
		const entry = this.connections.get(connection);
		if (entry) {
			removeAwarenessStates(this.awareness, Array.from(entry.clients), null);
		}

		this.connections.delete(connection);

		return this;
	}

	addDirectConnection(): Document {
		this.directConnectionsCount += 1;

		return this;
	}

	removeDirectConnection(): Document {
		if (this.directConnectionsCount > 0) {
			this.directConnectionsCount -= 1;
		}

		return this;
	}

	/**
	 * Get the number of active connections for this document
	 */
	getConnectionsCount(): number {
		return this.connections.size + this.directConnectionsCount;
	}

	/**
	 * Get an array of registered connections
	 */
	getConnections(): Array<Connection> {
		return Array.from(this.connections.keys());
	}

	/**
	 * Get the client ids for the given connection instance
	 */
	getClients(connection: Connection): Set<any> {
		const entry = this.connections.get(connection);

		return entry?.clients === undefined ? new Set() : entry.clients;
	}

	/**
	 * Has the document awareness states
	 */
	hasAwarenessStates(): boolean {
		return this.awareness.getStates().size > 0;
	}

	/**
	 * Apply the given awareness update
	 */
	applyAwarenessUpdate(connection: Connection, update: Uint8Array): Document {
		applyAwarenessUpdate(this.awareness, update, {
			source: "connection",
			connection,
		} satisfies ConnectionTransactionOrigin);

		return this;
	}

	/**
	 * Handle an awareness update and sync changes to clients
	 * @private
	 */
	private handleAwarenessUpdate(
		{ added, updated, removed }: AwarenessUpdate,
		origin: TransactionOrigin | null,
	): Document {
		const changedClients = added.concat(updated, removed);

		const originConnection: Connection | null =
			isTransactionOrigin(origin) && origin.source === "connection"
				? origin.connection
				: null;

		if (originConnection !== null) {
			const entry = this.connections.get(originConnection);

			if (entry) {
				added.forEach((clientId: any) => entry.clients.add(clientId));
				removed.forEach((clientId: any) => entry.clients.delete(clientId));
			}
		}

		if (this.flushDelay === false) {
			this.broadcastAwarenessUpdate(changedClients);

			return this;
		}

		for (const clientId of changedClients) {
			this.pendingAwarenessClients.add(clientId);
		}

		this.scheduleFlush();

		return this;
	}

	/**
	 * Send one message to every connection, encoding it once per run of
	 * connections that share a message address.
	 *
	 * Connections that share a message address receive byte-identical payloads,
	 * so consecutive connections with the same address reuse one buffer instead
	 * of re-encoding per connection. With session awareness disabled (the
	 * default) every connection on a document shares the plain document name,
	 * which collapses the whole broadcast to a single encode.
	 *
	 * A one-entry cache rather than a Map keyed by address: it makes the common
	 * cases optimal (all addresses equal, or all distinct) at no cost, and only
	 * gives up dedup when addresses interleave, where it still matches the
	 * previous encode-per-connection behaviour.
	 */
	private broadcast(
		encode: (messageAddress: string) => Uint8Array,
		filter?: (connection: Connection) => boolean,
	): void {
		let cachedAddress: string | undefined;
		let cachedMessage: Uint8Array | undefined;

		for (const connection of this.getConnections()) {
			if (filter !== undefined && !filter(connection)) {
				continue;
			}

			const address = connection.messageAddress;

			if (cachedMessage === undefined || address !== cachedAddress) {
				cachedAddress = address;
				cachedMessage = encode(address);
			}

			connection.send(cachedMessage);
		}
	}

	private broadcastAwarenessUpdate(changedClients: Array<number>): void {
		this.broadcast((address) =>
			new OutgoingMessage(address)
				.createAwarenessUpdateMessage(this.awareness, changedClients)
				.toUint8Array(),
		);
	}

	/**
	 * Handle an updated document and sync changes to clients
	 */
	private handleUpdate(update: Uint8Array, origin: unknown): Document {
		// Stays synchronous even when broadcasts are batched: this drives
		// `onChange`, the `onStoreDocument` debounce and the Redis publish in
		// extension-redis. Deferring it would change persistence and cluster
		// sync timing, not just the wire traffic.
		this.callbacks.onUpdate(this, origin, update);

		if (this.flushDelay === false) {
			this.broadcastUpdate(update);

			return this;
		}

		this.pendingUpdates.push(update);
		this.pendingUpdateBytes += update.length;

		if (this.pendingUpdateBytes >= this.flushMaxBytes) {
			this.flush();
		} else {
			this.scheduleFlush();
		}

		return this;
	}

	private broadcastUpdate(update: Uint8Array): void {
		this.broadcast((address) =>
			new OutgoingMessage(address)
				.createSyncMessage()
				.writeUpdate(update)
				.toUint8Array(),
		);
	}

	/**
	 * Fixed-window batching: the first buffered change starts the window and
	 * everything until it closes goes out together, so the added latency stays
	 * capped at `flushDelay` instead of growing while clients keep typing.
	 *
	 * `flushDelay: 0` means "coalesce whatever arrives in this event loop turn".
	 * setImmediate runs right after the current poll phase, so a burst of socket
	 * reads is merged without adding any delay. `setTimeout(…, 0)` would not do
	 * that: it clamps to 1ms and runs in the timers phase.
	 */
	private scheduleFlush(): void {
		if (this.cancelFlush !== null) {
			return;
		}

		const run = () => {
			this.cancelFlush = null;
			this.flush();
		};

		if (this.flushDelay === 0 && typeof setImmediate === "function") {
			const handle = setImmediate(run);

			this.cancelFlush = () => clearImmediate(handle);

			return;
		}

		const handle = setTimeout(run, this.flushDelay as number);

		this.cancelFlush = () => clearTimeout(handle);
	}

	/**
	 * Send everything buffered for the current flush window right away. Document
	 * updates are merged into a single message; awareness collapses to the latest
	 * state of each changed client, so an add and a removal within one window
	 * resolve to the correct end state rather than both being sent.
	 *
	 * Safe to call when nothing is pending.
	 */
	public flush(): Document {
		if (this.cancelFlush !== null) {
			this.cancelFlush();
			this.cancelFlush = null;
		}

		if (this.pendingUpdates.length > 0) {
			const update =
				this.pendingUpdates.length === 1
					? this.pendingUpdates[0]
					: mergeUpdates(this.pendingUpdates);

			this.pendingUpdates = [];
			this.pendingUpdateBytes = 0;

			this.broadcastUpdate(update);
		}

		if (this.pendingAwarenessClients.size > 0) {
			const clients = Array.from(this.pendingAwarenessClients);

			this.pendingAwarenessClients.clear();

			this.broadcastAwarenessUpdate(clients);
		}

		return this;
	}

	/**
	 * Broadcast stateless message to all connections
	 *
	 * Shares one encoded buffer per message address like the update and awareness
	 * broadcasts. Not batched, though: stateless payloads are opaque discrete
	 * events, so unlike updates they cannot be merged and unlike awareness they
	 * do not collapse to a latest state — deferring them would delay delivery
	 * without reducing the number of messages.
	 */
	public broadcastStateless(
		payload: string,
		filter?: (conn: Connection) => boolean,
	): void {
		this.callbacks.beforeBroadcastStateless(this, payload);

		this.broadcast(
			(address) =>
				new OutgoingMessage(address).writeStateless(payload).toUint8Array(),
			filter,
		);
	}

	destroy() {
		// Send what is still buffered instead of dropping it, then stop batching:
		// `super.destroy()` tears the awareness down, which broadcasts one last
		// time, and that has to reach clients here just as it does on a document
		// that never batched. Usually a no-op, because a document is only
		// unloaded once its last connection is gone.
		this.flush();
		this.flushDelay = false;

		super.destroy();
		this.isDestroyed = true;
	}
}

export default Document;
