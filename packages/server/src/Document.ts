import { Mutex } from "async-mutex";
import type WebSocket from "ws";
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
		onUpdate: (
			document: Document,
			connection: Connection,
			update: Uint8Array,
		) => {},
		beforeBroadcastCommand: (document: Document, type: string, payload: any) => {},
		beforeBroadcastEvent: (document: Document, type: string, payload: any) => {},
	};

	connections: Map<
		WebSocket,
		{
			clients: Set<any>;
			connection: Connection;
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
		// eslint-disable-next-line no-underscore-dangle
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
		callback: (
			document: Document,
			connection: Connection,
			update: Uint8Array,
		) => void,
	): Document {
		this.callbacks.onUpdate = callback;

		return this;
	}

	/**
	 * Set a callback that will be triggered before a command is broadcasted
	 */
	beforeBroadcastCommand(
		callback: (document: Document, type: string, payload: any) => void,
	): Document {
		this.callbacks.beforeBroadcastCommand = callback;

		return this;
	}

	/**
	 * Set a callback that will be triggered before an event is broadcasted
	 */
	beforeBroadcastEvent(
		callback: (document: Document, type: string, payload: any) => void,
	): Document {
		this.callbacks.beforeBroadcastEvent = callback;

		return this;
	}

	/**
	 * Register a connection and a set of clients on this document keyed by the
	 * underlying websocket connection
	 */
	addConnection(connection: Connection): Document {
		this.connections.set(connection.webSocket, {
			clients: new Set(),
			connection,
		});

		return this;
	}

	/**
	 * Is the given connection registered on this document
	 */
	hasConnection(connection: Connection): boolean {
		return this.connections.has(connection.webSocket);
	}

	/**
	 * Remove the given connection from this document
	 */
	removeConnection(connection: Connection): Document {
		removeAwarenessStates(
			this.awareness,
			Array.from(this.getClients(connection.webSocket)),
			null,
		);

		this.connections.delete(connection.webSocket);

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
		return Array.from(this.connections.values()).map((data) => data.connection);
	}

	/**
	 * Get the client ids for the given connection instance
	 */
	getClients(connectionInstance: WebSocket): Set<any> {
		const connection = this.connections.get(connectionInstance);

		return connection?.clients === undefined ? new Set() : connection.clients;
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
		applyAwarenessUpdate(this.awareness, update, connection.webSocket);

		return this;
	}

	/**
	 * Handle an awareness update and sync changes to clients
	 * @private
	 */
	private handleAwarenessUpdate(
		{ added, updated, removed }: AwarenessUpdate,
		connectionInstance: WebSocket,
	): Document {
		const changedClients = added.concat(updated, removed);

		if (connectionInstance !== null) {
			const connection = this.connections.get(connectionInstance);

			if (connection) {
				added.forEach((clientId: any) => connection.clients.add(clientId));
				removed.forEach((clientId: any) => connection.clients.delete(clientId));
			}
		}

		const awarenessMessage = new OutgoingMessage(
			this.name,
		).createAwarenessUpdateMessage(this.awareness, changedClients);
		const encodedAwarenessMessage = awarenessMessage.toUint8Array();

		this.getConnections().forEach((connection) => {
			connection.send(encodedAwarenessMessage);
		});

		return this;
	}

	/**
	 * Handle an updated document and sync changes to clients
	 */
	private handleUpdate(update: Uint8Array, connection: Connection): Document {
		this.callbacks.onUpdate(this, connection, update);

		const message = new OutgoingMessage(this.name)
			.createSyncMessage()
			.writeUpdate(update);
		const encodedMessage = message.toUint8Array();

		this.getConnections().forEach((connection) => {
			connection.send(encodedMessage);
		});

		return this;
	}

	/**
	 * Broadcast a command to all connections
	 */
	public broadcastCommand(
		type: string,
		payload: any,
		filter?: (conn: Connection) => boolean,
	): void {
		this.callbacks.beforeBroadcastCommand(this, type, payload);

		const connections = filter
			? this.getConnections().filter(filter)
			: this.getConnections();

		connections.forEach((connection) => {
			connection.sendCommand(type, payload);
		});
	}

	/**
	 * Broadcast an event to all connections
	 */
	public broadcastEvent(
		type: string,
		payload: any,
		filter?: (conn: Connection) => boolean,
	): void {
		this.callbacks.beforeBroadcastEvent(this, type, payload);

		const connections = filter
			? this.getConnections().filter(filter)
			: this.getConnections();

		connections.forEach((connection) => {
			connection.sendEvent(type, payload);
		});
	}

	destroy() {
		super.destroy();
		this.isDestroyed = true;
	}
}

export default Document;
