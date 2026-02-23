import { Mutex } from "async-mutex";
import {
	Awareness,
	applyAwarenessUpdate,
	removeAwarenessStates,
} from "y-protocols/awareness";
import { Doc, applyUpdate, encodeStateAsUpdate } from "yjs";
import type Connection from "./Connection.ts";
import { OutgoingMessage } from "./OutgoingMessage.ts";
import type { AwarenessUpdate } from "./types.ts";

export class Document extends Doc {
	awareness: Awareness;

	callbacks = {
		// eslint-disable-next-line @typescript-eslint/no-empty-function
		onUpdate: (document: Document, origin: unknown, update: Uint8Array) => {},
		beforeBroadcastStateless: (document: Document, stateless: string) => {},
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
	 * Constructor.
	 */
	constructor(name: string, yDocOptions?: object) {
		super(yDocOptions);

		this.name = name;

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
			removeAwarenessStates(
				this.awareness,
				Array.from(entry.clients),
				null,
			);
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
		applyAwarenessUpdate(this.awareness, update, connection);

		return this;
	}

	/**
	 * Handle an awareness update and sync changes to clients
	 * @private
	 */
	private handleAwarenessUpdate(
		{ added, updated, removed }: AwarenessUpdate,
		originConnection: Connection | null,
	): Document {
		const changedClients = added.concat(updated, removed);

		if (originConnection !== null) {
			const entry = this.connections.get(originConnection);

			if (entry) {
				added.forEach((clientId: any) => entry.clients.add(clientId));
				removed.forEach((clientId: any) => entry.clients.delete(clientId));
			}
		}

		for (const connection of this.getConnections()) {
			const awarenessMessage = new OutgoingMessage(
				connection.messageAddress,
			).createAwarenessUpdateMessage(this.awareness, changedClients);

			connection.send(awarenessMessage.toUint8Array());
		}

		return this;
	}

	/**
	 * Handle an updated document and sync changes to clients
	 */
	private handleUpdate(update: Uint8Array, origin: unknown): Document {
		this.callbacks.onUpdate(this, origin, update);

		for (const connection of this.getConnections()) {
			const message = new OutgoingMessage(connection.messageAddress)
				.createSyncMessage()
				.writeUpdate(update);

			connection.send(message.toUint8Array());
		}

		return this;
	}

	/**
	 * Broadcast stateless message to all connections
	 */
	public broadcastStateless(
		payload: string,
		filter?: (conn: Connection) => boolean,
	): void {
		this.callbacks.beforeBroadcastStateless(this, payload);

		const connections = filter
			? this.getConnections().filter(filter)
			: this.getConnections();

		connections.forEach((connection) => {
			connection.sendStateless(payload);
		});
	}

	destroy() {
		super.destroy();
		this.isDestroyed = true;
	}
}

export default Document;
