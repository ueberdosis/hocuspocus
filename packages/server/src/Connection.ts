import {
	type CloseEvent,
	ResetConnection,
	WsReadyStates,
} from "@hocuspocus/common";
import type Document from "./Document.ts";
import { IncomingMessage } from "./IncomingMessage.ts";
import { MessageReceiver } from "./MessageReceiver.ts";
import { OutgoingMessage } from "./OutgoingMessage.ts";
import type {
	WebSocketLike,
	beforeSyncPayload,
	onStatelessPayload,
} from "./types.ts";

export class Connection<Context = any> {
	webSocket: WebSocketLike;

	context: Context;

	document: Document;

	request: Request;

	callbacks = {
		onClose: [(document: Document, event?: CloseEvent) => {}],
		beforeHandleMessage: (connection: Connection, update: Uint8Array) =>
			Promise.resolve(),
		beforeSync: (
			connection: Connection,
			payload: Pick<beforeSyncPayload, "type" | "payload">,
		) => Promise.resolve(),
		statelessCallback: (payload: onStatelessPayload) => Promise.resolve(),
		onTokenSyncCallback: (payload: { token: string }) => Promise.resolve(),
	};

	socketId: string;

	readOnly: boolean;

	sessionId: string | null;

	providerVersion: string | null;

	/**
	 * The address string prefixed to outgoing messages.
	 * Session-aware clients get `documentName\0sessionId`; legacy clients get plain `documentName`.
	 */
	get messageAddress(): string {
		return this.sessionId
			? `${this.document.name}\0${this.sessionId}`
			: this.document.name;
	}

	private messageQueue: Uint8Array[] = [];

	private processingPromise: Promise<void> = Promise.resolve();

	/**
	 * Constructor.
	 */
	constructor(
		connection: WebSocketLike,
		request: Request,
		document: Document,
		socketId: string,
		context: Context,
		readOnly = false,
		sessionId?: string | null,
		providerVersion?: string | null,
	) {
		this.webSocket = connection;
		this.context = context;
		this.document = document;
		this.request = request;
		this.socketId = socketId;
		this.readOnly = readOnly;
		this.sessionId = sessionId ?? null;
		this.providerVersion = providerVersion ?? null;

		this.document.addConnection(this);

		this.sendCurrentAwareness();
	}

	/**
	 * Set a callback that will be triggered when the connection is closed
	 */
	onClose(
		callback: (document: Document, event?: CloseEvent) => void,
	): Connection {
		this.callbacks.onClose.push(callback);

		return this;
	}

	/**
	 * Set a callback that will be triggered when an stateless message is received
	 */
	onStatelessCallback(
		callback: (payload: onStatelessPayload) => Promise<void>,
	): Connection {
		this.callbacks.statelessCallback = callback;

		return this;
	}

	/**
	 * Set a callback that will be triggered before an message is handled
	 */
	beforeHandleMessage(
		callback: (connection: Connection, update: Uint8Array) => Promise<any>,
	): Connection {
		this.callbacks.beforeHandleMessage = callback;

		return this;
	}

	/**
	 * Set a callback that will be triggered before a sync message is handled
	 */
	beforeSync(
		callback: (
			connection: Connection,
			payload: Pick<beforeSyncPayload, "type" | "payload">,
		) => Promise<any>,
	): Connection {
		this.callbacks.beforeSync = callback;

		return this;
	}

	/**
	 * Set a callback that will be triggered when on token sync message is received
	 */
	onTokenSyncCallback(
		callback: (payload: { token: string }) => Promise<void>,
	): Connection {
		this.callbacks.onTokenSyncCallback = callback;

		return this;
	}

	/**
	 * Returns a promise that resolves when all queued messages have been processed.
	 */
	waitForPendingMessages(): Promise<void> {
		return this.processingPromise;
	}

	/**
	 * Send the given message
	 */
	send(message: Uint8Array): void {
		if (
			this.webSocket.readyState === WsReadyStates.Closing ||
			this.webSocket.readyState === WsReadyStates.Closed
		) {
			this.close();
			return;
		}

		try {
			this.webSocket.send(message);
		} catch (exception) {
			this.close();
		}
	}

	/**
	 * Send a stateless message with payload
	 */
	public sendStateless(payload: string): void {
		const message = new OutgoingMessage(this.messageAddress).writeStateless(
			payload,
		);

		this.send(message.toUint8Array());
	}

	/**
	 * Request current token from the client
	 */
	public requestToken(): void {
		const message = new OutgoingMessage(
			this.messageAddress,
		).writeTokenSyncRequest();

		this.send(message.toUint8Array());
	}

	/**
	 * Graceful wrapper around the WebSocket close method.
	 */
	close(event?: CloseEvent): void {
		if (this.document.hasConnection(this)) {
			this.document.removeConnection(this);
			this.callbacks.onClose.forEach(
				(callback: (arg0: Document, arg1?: CloseEvent) => any) =>
					callback(this.document, event),
			);

			const closeMessage = new OutgoingMessage(this.messageAddress);
			closeMessage.writeCloseMessage(
				event?.reason ?? "Server closed the connection",
			);
			this.send(closeMessage.toUint8Array());
		}
	}

	/**
	 * Send the current document awareness to the client, if any
	 * @private
	 */
	private sendCurrentAwareness(): void {
		if (!this.document.hasAwarenessStates()) {
			return;
		}

		const awarenessMessage = new OutgoingMessage(
			this.messageAddress,
		).createAwarenessUpdateMessage(this.document.awareness);

		this.send(awarenessMessage.toUint8Array());
	}

	/**
	 * Handle an incoming message
	 * @public
	 */
	public handleMessage(data: Uint8Array): void {
		this.messageQueue.push(data);

		if (this.messageQueue.length === 1) {
			this.processingPromise = this.processMessages();
		}
	}

	private async processMessages() {
		while (this.messageQueue.length > 0) {
			const rawUpdate = this.messageQueue.at(0) as Uint8Array;

			const message = new IncomingMessage(rawUpdate);
			const rawKey = message.readVarString();

			// Accept messages addressed with either the plain documentName or documentName\0sessionId
			const sepIdx = rawKey.indexOf('\0');
			const documentName = sepIdx === -1 ? rawKey : rawKey.substring(0, sepIdx);
			if (documentName !== this.document.name) {
				this.messageQueue.shift();
				continue;
			}

			// Write the correct address so replies reach the right provider
			message.writeVarString(this.messageAddress);

			try {
				await this.callbacks.beforeHandleMessage(this, rawUpdate);
				const receiver = new MessageReceiver(message);

				await receiver.apply(this.document, this);
				// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			} catch (e: any) {
				console.error(
					`closing connection ${this.socketId} (while handling ${documentName}) because of exception`,
					e,
				);
				this.close({
					code: "code" in e && typeof e.code === 'number' ? e.code : ResetConnection.code,
					reason: "reason" in e ? e.reason : ResetConnection.reason,
				});
			}

			this.messageQueue.shift();
		}
	}
}

export default Connection;
