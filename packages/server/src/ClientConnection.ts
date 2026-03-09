import crypto from "node:crypto";
import {
	type CloseEvent,
	ConnectionTimeout,
	Forbidden,
	ResetConnection,
	Unauthorized,
	WsReadyStates,
} from "@hocuspocus/common";
import * as decoding from "lib0/decoding";
import Connection from "./Connection.ts";
import type Document from "./Document.ts";
import type { Hocuspocus } from "./Hocuspocus.ts";
import { IncomingMessage as SocketIncomingMessage } from "./IncomingMessage.ts";
import { OutgoingMessage } from "./OutgoingMessage.ts";
import type {
	ConnectionConfiguration,
	WebSocketLike,
	beforeHandleMessagePayload,
	beforeSyncPayload,
	onDisconnectPayload,
} from "./types.ts";
import { MessageType } from "./types.ts";
import { getParameters } from "./util/getParameters.ts";

/**
 * The `ClientConnection` class is responsible for handling an incoming WebSocket
 *
 * TODO-refactor:
 * - use event handlers instead of calling hooks directly, hooks should probably be called from Hocuspocus.ts
 */
export class ClientConnection<Context = any> {
	// Map of established document connections, keyed by rawKey (composite or plain)
	private readonly documentConnections: Record<string, Connection<Context>> =
		{};

	// While the connection will be establishing messages will
	// be queued and handled later.
	private readonly incomingMessageQueue: Record<string, Uint8Array[]> = {};

	// While the connection is establishing, keep track of which documents have received auth
	private readonly documentConnectionsEstablished = new Set<string>();

	// Hook payloads keyed by rawKey (composite or plain)
	private readonly hookPayloads: Record<
		string,
		{
			instance: Hocuspocus;
			request: Request;
			requestHeaders: Headers;
			requestParameters: URLSearchParams;
			socketId: string;
			connectionConfig: ConnectionConfiguration;
			context: Context;
			providerVersion: string | null;
		}
	> = {};

	private readonly callbacks = {
		onClose: [(document: Document, payload: onDisconnectPayload) => {}],
	};

	// Every new connection gets a unique identifier.
	private readonly socketId = crypto.randomUUID();

	timeout: number;

	pingInterval: NodeJS.Timeout;

	lastMessageReceivedAt = Date.now();

	/**
	 * The `ClientConnection` class receives incoming WebSocket connections,
	 * runs all hooks:
	 *
	 *  - onConnect for all connections
	 *  - onAuthenticate only if required
	 *
	 * … and if nothings fails it'll fully establish the connection and
	 * load the Document then.
	 */
	constructor(
		private readonly websocket: WebSocketLike,
		private readonly request: Request,
		private readonly documentProvider: {
			createDocument: Hocuspocus["createDocument"];
		},
		// TODO: change to events
		private readonly hooks: Hocuspocus["hooks"],
		private readonly opts: {
			timeout: number;
		},
		private readonly defaultContext: Context = {} as Context,
	) {
		this.timeout = opts.timeout;
		this.pingInterval = setInterval(this.check, this.timeout);
	}

	/**
	 * Handle WebSocket close event. Call this from your integration
	 * when the WebSocket connection closes.
	 */
	handleClose(event?: CloseEvent) {
		this.close(event);
		clearInterval(this.pingInterval);
	}

	private close(event?: CloseEvent) {
		Object.values(this.documentConnections).forEach((connection) =>
			connection.close(event),
		);
	}

	/**
	 * Close the connection if no messages have been received within the timeout period.
	 * This replaces application-level ping/pong to maintain backward compatibility
	 * with older provider versions that don't understand Ping/Pong message types.
	 * Awareness updates (~every 30s) keep active connections alive.
	 */
	private check = () => {
		if (Date.now() - this.lastMessageReceivedAt > this.timeout) {
			this.close(ConnectionTimeout);
		}
	};

	/**
	 * Set a callback that will be triggered when the connection is closed
	 */
	public onClose(
		callback: (document: Document, payload: onDisconnectPayload) => void,
	): ClientConnection {
		this.callbacks.onClose.push(callback);

		return this;
	}

	/**
	 * Create a new connection by the given request and document
	 */
	private createConnection(
		connection: WebSocketLike,
		document: Document,
		hookPayload: (typeof this.hookPayloads)[string],
		sessionId: string | null,
		providerVersion: string | null,
	): Connection {
		const instance = new Connection(
			connection,
			hookPayload.request,
			document,
			hookPayload.socketId,
			hookPayload.context,
			hookPayload.connectionConfig.readOnly,
			sessionId,
			providerVersion,
		);

		instance.onClose(async (document, event) => {
			// Wait for any pending message processing to complete before running
			// disconnect hooks. This ensures that document updates from queued messages
			// are applied (and their debounced onStoreDocument scheduled) before the
			// disconnect handler checks whether to call executeNow.
			await instance.waitForPendingMessages();

			const disconnectHookPayload: onDisconnectPayload = {
				instance: this.documentProvider as Hocuspocus, // TODO, this will be removed when we use events instead of hooks for this class
				clientsCount: document.getConnectionsCount(),
				context: hookPayload.context,
				document,
				socketId: hookPayload.socketId,
				documentName: document.name,
				requestHeaders: hookPayload.request.headers,
				requestParameters: getParameters(hookPayload.request),
			};

			await this.hooks("onDisconnect", disconnectHookPayload);
			this.callbacks.onClose.forEach((callback) =>
				callback(document, disconnectHookPayload),
			);
		});

		instance.onStatelessCallback(async (payload) => {
			try {
				return await this.hooks("onStateless", payload);
			} catch (error: any) {
				if (error?.message) {
					// if a hook rejects and the error is empty, do nothing
					// this is only meant to prevent later hooks and the
					// default handler to do something. if an error is present
					// just rethrow it
					throw error;
				}
			}
		});

		instance.beforeHandleMessage((connection, update) => {
			const beforeHandleMessagePayload: beforeHandleMessagePayload = {
				instance: this.documentProvider as Hocuspocus, // TODO, this will be removed when we use events instead of hooks for this class
				clientsCount: document.getConnectionsCount(),
				context: hookPayload.context,
				document,
				socketId: hookPayload.socketId,
				connection,
				documentName: document.name,
				requestHeaders: hookPayload.request.headers,
				requestParameters: getParameters(hookPayload.request),
				update,
			};

			return this.hooks("beforeHandleMessage", beforeHandleMessagePayload);
		});

		instance.beforeSync((connection, payload) => {
			const beforeSyncPayload: beforeSyncPayload = {
				clientsCount: document.getConnectionsCount(),
				context: hookPayload.context,
				document,
				documentName: document.name,
				connection,
				type: payload.type,
				payload: payload.payload,
			};

			return this.hooks("beforeSync", beforeSyncPayload);
		});

		return instance;
	}

	// Once all hooks are run, we'll fully establish the connection:
	private setUpNewConnection = async (rawKey: string, documentName: string, sessionId: string | null) => {
		const hookPayload = this.hookPayloads[rawKey];
		// If no hook interrupts, create a document and connection
		const document = await this.documentProvider.createDocument(
			documentName,
			hookPayload.request,
			hookPayload.socketId,
			hookPayload.connectionConfig,
			hookPayload.context,
		);
		const connection = this.createConnection(this.websocket, document, hookPayload, sessionId, hookPayload.providerVersion);

		connection.onClose((document, event) => {
			delete this.hookPayloads[rawKey];
			delete this.documentConnections[rawKey];
			delete this.incomingMessageQueue[rawKey];
			this.documentConnectionsEstablished.delete(rawKey);
		});

		connection.onTokenSyncCallback(async (payload) => {
			try {
				return await this.hooks(
					"onTokenSync",
					{
						...hookPayload,
						...payload,
						document,
						connection,
						documentName,
					},
					(contextAdditions: Partial<Context>) => {
						hookPayload.context = {
							...hookPayload.context,
							...contextAdditions,
						};
					},
				);
			} catch (err: any) {
				console.error(err);
				const error = { ...Unauthorized, ...err };
				connection.close({ code: error.code, reason: error.reason });
			}
		});

		this.documentConnections[rawKey] = connection;

		// If the WebSocket has already disconnected (wow, that was fast) – then
		// immediately call close to cleanup the connection and document in memory.
		if (
			this.websocket.readyState === WsReadyStates.Closing ||
			this.websocket.readyState === WsReadyStates.Closed
		) {
			this.close();
			return;
		}

		// Drain queued messages to the Connection.
		this.incomingMessageQueue[rawKey]?.forEach((input) => {
			connection.handleMessage(input);
		});

		await this.hooks("connected", {
			...hookPayload,
			documentName,
			context: hookPayload.context,
			connection,
		});
	};

	// This listener handles authentication messages and queues everything else.
	private handleQueueingMessage = async (data: Uint8Array, rawKey: string, documentName: string) => {
		try {
			const tmpMsg = new SocketIncomingMessage(data);

			decoding.readVarString(tmpMsg.decoder); // skip the message address (already extracted)
			const type = decoding.readVarUint(tmpMsg.decoder);

			if (
				!(
					type === MessageType.Auth &&
					!this.documentConnectionsEstablished.has(rawKey)
				)
			) {
				this.incomingMessageQueue[rawKey].push(data);
				return;
			}

			// Okay, we've got the authentication message we're waiting for:
			this.documentConnectionsEstablished.add(rawKey);

			// The 2nd integer contains the submessage type
			// which will always be authentication when sent from client -> server
			decoding.readVarUint(tmpMsg.decoder);
			const token = decoding.readVarString(tmpMsg.decoder);

			// Try to read providerVersion (new protocol field)
			let providerVersion: string | null = null;
			if (decoding.hasContent(tmpMsg.decoder)) {
				providerVersion = decoding.readVarString(tmpMsg.decoder);
			}

			// Extract sessionId from the rawKey (documentName\0sessionId) if present
			const sepIdx = rawKey.indexOf('\0');
			const sessionId = sepIdx === -1 ? null : rawKey.substring(sepIdx + 1);

			// Response uses rawKey so session-aware clients can route correctly
			const responseAddress = rawKey;

			try {
				const hookPayload = this.hookPayloads[rawKey];
				hookPayload.providerVersion = providerVersion;

				await this.hooks(
					"onConnect",
					{ ...hookPayload, documentName },
					(contextAdditions: Partial<Context>) => {
						hookPayload.context = {
							...hookPayload.context,
							...contextAdditions,
						};
					},
				);

				await this.hooks(
					"onAuthenticate",
					{
						token,
						...hookPayload,
						documentName,
					},
					(contextAdditions: Partial<Context>) => {
						hookPayload.context = {
							...hookPayload.context,
							...contextAdditions,
						};
					},
				);
				// All `onAuthenticate` hooks passed.
				hookPayload.connectionConfig.isAuthenticated = true;

				// Let the client know that authentication was successful.
				const message = new OutgoingMessage(responseAddress).writeAuthenticated(
					hookPayload.connectionConfig.readOnly,
				);

				this.websocket.send(message.toUint8Array());

				// Time to actually establish the connection.
				await this.setUpNewConnection(rawKey, documentName, sessionId);
			} catch (err: any) {
				const error = err || Forbidden;
				const message = new OutgoingMessage(responseAddress).writePermissionDenied(
					error.reason ?? "permission-denied",
				);

				this.websocket.send(message.toUint8Array());

				// Clean up all state for this document so a retry is treated
				// as a fresh first connection attempt.
				this.documentConnectionsEstablished.delete(rawKey);
				delete this.hookPayloads[rawKey];
				delete this.incomingMessageQueue[rawKey];
			}

			// Catch errors due to failed decoding of data
		} catch (error) {
			console.error(error);
			this.websocket.close(ResetConnection.code, ResetConnection.reason);
		}
	};

	/**
	 * Handle an incoming WebSocket message. Call this from your integration
	 * when the WebSocket receives a binary message.
	 */
	handleMessage = (data: Uint8Array) => {
		this.lastMessageReceivedAt = Date.now();

		try {
			const tmpMsg = new SocketIncomingMessage(data);

			const rawKey = decoding.readVarString(tmpMsg.decoder);

			// Extract the plain documentName (the raw key may be documentName\0sessionId)
			const sepIdx = rawKey.indexOf('\0');
			const documentName = sepIdx === -1 ? rawKey : rawKey.substring(0, sepIdx);

			// Look up by rawKey first (session-aware providers), then fall back
			// to plain documentName for backward compatibility with old providers
			const connection = this.documentConnections[rawKey]
				?? this.documentConnections[documentName];
			if (connection) {
				connection.handleMessage(data);
				return;
			}

			const isFirst = this.incomingMessageQueue[rawKey] === undefined;
			if (isFirst) {
				this.incomingMessageQueue[rawKey] = [];
				if (this.hookPayloads[rawKey]) {
					throw new Error("first message, but hookPayloads exists");
				}

				this.hookPayloads[rawKey] = {
					instance: this.documentProvider as Hocuspocus,
					request: this.request,
					connectionConfig: {
						readOnly: false,
						isAuthenticated: false,
					},
					requestHeaders: this.request.headers,
					requestParameters: getParameters(this.request),
					socketId: this.socketId,
					context: {
						...this.defaultContext,
					},
					providerVersion: null as string | null,
				};
			}

			this.handleQueueingMessage(data, rawKey, documentName);
		} catch (closeError) {
			// catch is needed in case an invalid payload crashes the parsing of the Uint8Array
			console.error(closeError);
			this.websocket.close(Unauthorized.code, Unauthorized.reason);
		}
	};
}
