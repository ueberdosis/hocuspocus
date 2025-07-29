import type { IncomingMessage as HTTPIncomingMessage } from "node:http";
import {
	type CloseEvent,
	ResetConnection,
	WsReadyStates,
} from "@hocuspocus/common";
import type WebSocket from "ws";
import type Document from "./Document.ts";
import { IncomingMessage } from "./IncomingMessage.ts";
import { MessageReceiver } from "./MessageReceiver.ts";
import { OutgoingMessage } from "./OutgoingMessage.ts";
import type { beforeSyncPayload, onStatelessPayload } from "./types.ts";

export class Connection {
	webSocket: WebSocket;

	context: any;

	document: Document;

	request: HTTPIncomingMessage;

	callbacks = {
		onClose: [(document: Document, event?: CloseEvent) => {}],
		beforeHandleMessage: (connection: Connection, update: Uint8Array) =>
			Promise.resolve(),
		beforeSync: (
			connection: Connection,
			payload: Pick<beforeSyncPayload, "type" | "payload">,
		) => Promise.resolve(),
		statelessCallback: (payload: onStatelessPayload) => Promise.resolve(),
	};

	socketId: string;

	readOnly: boolean;

	/**
	 * Constructor.
	 */
	constructor(
		connection: WebSocket,
		request: HTTPIncomingMessage,
		document: Document,
		socketId: string,
		context: any,
		readOnly = false,
	) {
		this.webSocket = connection;
		this.context = context;
		this.document = document;
		this.request = request;
		this.socketId = socketId;
		this.readOnly = readOnly;

		this.webSocket.binaryType = "nodebuffer";
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
	 * Send the given message
	 */
	send(message: any): void {
		if (
			this.webSocket.readyState === WsReadyStates.Closing ||
			this.webSocket.readyState === WsReadyStates.Closed
		) {
			this.close();
			return;
		}

		try {
			this.webSocket.send(message, (error: any) => {
				if (error != null) this.close();
			});
		} catch (exception) {
			this.close();
		}
	}

	/**
	 * Send a stateless message with payload
	 */
	public sendStateless(payload: string): void {
		const message = new OutgoingMessage(this.document.name).writeStateless(
			payload,
		);

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

			const closeMessage = new OutgoingMessage(this.document.name);
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
			this.document.name,
		).createAwarenessUpdateMessage(this.document.awareness);

		this.send(awarenessMessage.toUint8Array());
	}

	/**
	 * Handle an incoming message
	 * @public
	 */
	public handleMessage(data: Uint8Array): void {
		const message = new IncomingMessage(data);
		const documentName = message.readVarString();

		if (documentName !== this.document.name) return;

		message.writeVarString(documentName);

		this.callbacks
			.beforeHandleMessage(this, data)
			.then(() => {
				new MessageReceiver(message)
					.apply(this.document, this)
					.catch((e: any) => {
						console.error(
							`closing connection ${this.socketId} (while handling ${documentName}) because of exception`,
							e,
						);
						this.close({
							code: "code" in e ? e.code : ResetConnection.code,
							reason: "reason" in e ? e.reason : ResetConnection.reason,
						});
					});
			})
			.catch((e: any) => {
				console.error(
					`closing connection ${this.socketId} (while handling ${documentName}) because of exception`,
					e,
				);
				this.close({
					code: "code" in e ? e.code : ResetConnection.code,
					reason: "reason" in e ? e.reason : ResetConnection.reason,
				});
			});
	}
}

export default Connection;
