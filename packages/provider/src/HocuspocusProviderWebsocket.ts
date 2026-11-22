import { WsReadyStates } from "@hocuspocus/common";
import { retry } from "@lifeomic/attempt";
import { createDecoder, readVarString, readVarUint } from "lib0/decoding";
import * as encoding from "lib0/encoding";
import * as time from "lib0/time";
import EventEmitter from "./EventEmitter.ts";
import type { HocuspocusProvider } from "./HocuspocusProvider.ts";
import { HttpSocket } from "./HttpSocket.ts";
import { IncomingMessage } from "./IncomingMessage.ts";
import { CloseMessage } from "./OutgoingMessages/CloseMessage.ts";
import {
	type HocuspocusTransport,
	MessageType,
	type onAwarenessChangeParameters,
	type onAwarenessUpdateParameters,
	type onCloseParameters,
	type onDisconnectParameters,
	type onMaxAttemptsFailedParameters,
	type onMessageParameters,
	type onOpenParameters,
	type onOutgoingMessageParameters,
	type onStatusParameters,
	WebSocketStatus,
} from "./types.ts";

// How long a transport that failed to connect is skipped.
const FAILED_TRANSPORT_TTL = 300_000;

const TRANSPORTS: HocuspocusTransport[] = ["websocket", "sse", "polling"];

// A longer delay overflows setTimeout, which then fires at once.
const MAX_TIMEOUT = 2_147_483_647;

export type HocuspocusWebSocket = WebSocket & { identifier: string };
export type HocusPocusWebSocket = HocuspocusWebSocket;

export type HocuspocusProviderWebsocketConfiguration = Required<
	Pick<CompleteHocuspocusProviderWebsocketConfiguration, "url">
> &
	Partial<CompleteHocuspocusProviderWebsocketConfiguration>;

export interface CompleteHocuspocusProviderWebsocketConfiguration {
	/**
	 * Whether to connect automatically when creating the provider instance. Default=true
	 */
	autoConnect: boolean;

	/**
	 * URL of your @hocuspocus/server instance
	 */
	url: string;

	/**
	 * By default, trailing slashes are removed from the URL. Set this to true
	 * to preserve trailing slashes if your server configuration requires them.
	 */
	preserveTrailingSlash: boolean;

	/**
	 * An optional WebSocket polyfill, for example for Node.js
	 */
	WebSocketPolyfill: any;

	/**
	 * Disconnect when no message is received for the defined amount of milliseconds.
	 */
	messageReconnectTimeout: number;
	/**
	 * Transports tried in order on every connection attempt.
	 * `["websocket", "sse", "polling"]` enables the HTTP fallbacks, `["sse"]`
	 * uses server-sent events only. The HTTP transports need `httpFallback` on
	 * the server. Default=["websocket"]
	 */
	transports: HocuspocusTransport[];
	/**
	 * Milliseconds a transport gets to open before the next one is tried. Also
	 * bounds the retries of HTTP transport requests. Default=10000
	 */
	connectTimeout: number;
	/**
	 * The delay between each attempt in milliseconds. You can provide a factor to have the delay grow exponentially.
	 */
	delay: number;
	/**
	 * The initialDelay is the amount of time to wait before making the first attempt. This option should typically be 0 since you typically want the first attempt to happen immediately.
	 */
	initialDelay: number;
	/**
	 * The factor option is used to grow the delay exponentially.
	 */
	factor: number;
	/**
	 * The maximum number of attempts or 0 if there is no limit on number of attempts.
	 */
	maxAttempts: number;
	/**
	 * minDelay is used to set a lower bound of delay when jitter is enabled. This property has no effect if jitter is disabled.
	 */
	minDelay: number;
	/**
	 * The maxDelay option is used to set an upper bound for the delay when factor is enabled. A value of 0 can be provided if there should be no upper bound when calculating delay.
	 */
	maxDelay: number;
	/**
	 * If jitter is true then the calculated delay will be a random integer value between minDelay and the calculated delay for the current iteration.
	 */
	jitter: boolean;
	/**
	 * A timeout in milliseconds. If timeout is non-zero then a timer is set using setTimeout. If the timeout is triggered then future attempts will be aborted.
	 */
	timeout: number;
	handleTimeout: (() => Promise<unknown>) | null;
	onOpen: (data: onOpenParameters) => void;
	onConnect: () => void;
	onMessage: (data: onMessageParameters) => void;
	onOutgoingMessage: (data: onOutgoingMessageParameters) => void;
	onStatus: (data: onStatusParameters) => void;
	onDisconnect: (data: onDisconnectParameters) => void;
	onClose: (data: onCloseParameters) => void;
	onMaxAttemptsFailed: (data: onMaxAttemptsFailedParameters) => void;
	onDestroy: () => void;
	onAwarenessUpdate: (data: onAwarenessUpdateParameters) => void;
	onAwarenessChange: (data: onAwarenessChangeParameters) => void;

	/**
	 * Map of attached providers keyed by documentName.
	 */
	providerMap: Map<string, HocuspocusProvider>;
}

export class HocuspocusProviderWebsocket extends EventEmitter {
	private static readonly DEDUPLICATABLE_TYPES = new Set([
		MessageType.Awareness,
		MessageType.QueryAwareness,
	]);

	private messageQueue: any[] = [];

	public configuration: CompleteHocuspocusProviderWebsocketConfiguration = {
		url: "",
		autoConnect: true,
		preserveTrailingSlash: false,
		// @ts-expect-error
		document: undefined,
		WebSocketPolyfill: undefined,
		// TODO: this should depend on awareness.outdatedTime
		messageReconnectTimeout: 30000,
		// WebSocket only
		transports: ["websocket"],
		// 10 seconds
		connectTimeout: 10000,
		// 1 second
		delay: 1000,
		// instant
		initialDelay: 0,
		// double the delay each time
		factor: 2,
		// unlimited retries
		maxAttempts: 0,
		// wait at least 1 second
		minDelay: 1000,
		// at least every 30 seconds
		maxDelay: 30000,
		// randomize
		jitter: true,
		// retry forever
		timeout: 0,
		onOpen: () => null,
		onConnect: () => null,
		onMessage: () => null,
		onOutgoingMessage: () => null,
		onStatus: () => null,
		onDisconnect: () => null,
		onClose: () => null,
		onMaxAttemptsFailed: () => null,
		onDestroy: () => null,
		onAwarenessUpdate: () => null,
		onAwarenessChange: () => null,
		handleTimeout: null,
		providerMap: new Map(),
	};

	webSocket: HocusPocusWebSocket | null = null;

	/**
	 * Transport of the current socket.
	 */
	transport: HocuspocusTransport | null = null;

	// Transport → time until which it is skipped.
	private failedTransports = new Map<HocuspocusTransport, number>();

	// Bounds the time a WebSocket takes to open and, once something was sent
	// through it, to deliver its first message. Only used when there are other
	// transports to turn to.
	private connectTimer: ReturnType<typeof setTimeout> | null = null;

	webSocketHandlers: { [key: string]: any } = {};

	shouldConnect = true;

	status = WebSocketStatus.Disconnected;

	lastMessageReceived = 0;

	identifier = 0;

	intervals: any = {
		connectionChecker: null,
	};

	connectionAttempt: {
		resolve: (value?: any) => void;
		reject: (reason?: any) => void;
	} | null = null;

	constructor(configuration: HocuspocusProviderWebsocketConfiguration) {
		super();
		this.setConfiguration(configuration);

		this.configuration.WebSocketPolyfill = configuration.WebSocketPolyfill
			? configuration.WebSocketPolyfill
			: globalThis.WebSocket;

		this.on("open", this.configuration.onOpen);
		this.on("open", this.onOpen.bind(this));
		this.on("connect", this.configuration.onConnect);
		this.on("message", this.configuration.onMessage);
		this.on("outgoingMessage", this.configuration.onOutgoingMessage);
		this.on("status", this.configuration.onStatus);
		this.on("disconnect", this.configuration.onDisconnect);
		this.on("close", this.configuration.onClose);
		this.on("maxAttemptsFailed", this.configuration.onMaxAttemptsFailed);
		this.on("destroy", this.configuration.onDestroy);
		this.on("awarenessUpdate", this.configuration.onAwarenessUpdate);
		this.on("awarenessChange", this.configuration.onAwarenessChange);

		this.on("close", this.onClose.bind(this));
		this.on("message", this.onMessage.bind(this));

		this.intervals.connectionChecker = setInterval(
			this.checkConnection.bind(this),
			this.configuration.messageReconnectTimeout / 10,
		);

		if (this.shouldConnect) {
			this.connect();
		}
	}

	receivedOnOpenPayload?: Event | undefined = undefined;

	async onOpen(event: Event) {
		this.status = WebSocketStatus.Connected;
		this.emit("status", { status: WebSocketStatus.Connected });

		this.receivedOnOpenPayload = event;
	}

	attach(provider: HocuspocusProvider) {
		const key = provider.effectiveName;
		const existing = this.configuration.providerMap.get(key);

		if (existing && existing !== provider) {
			// Allow replacing a provider that hasn't authenticated (e.g., after auth failure retry)
			if (existing.isAuthenticated) {
				throw new Error(
					`Cannot attach two providers with the same effective name "${key}". ` +
						"Use sessionAwareness: true to multiplex providers with the same document name.",
				);
			}
		}

		this.configuration.providerMap.set(key, provider);

		if (this.status === WebSocketStatus.Disconnected && this.shouldConnect) {
			this.connect();
		}

		if (
			this.receivedOnOpenPayload &&
			this.status === WebSocketStatus.Connected
		) {
			provider.onOpen(this.receivedOnOpenPayload);
		}
	}

	detach(provider: HocuspocusProvider) {
		const key = provider.effectiveName;
		if (this.configuration.providerMap.has(key)) {
			provider.send(CloseMessage, {
				documentName: key,
			});
			this.configuration.providerMap.delete(key);
		}
	}

	public setConfiguration(
		configuration: Partial<HocuspocusProviderWebsocketConfiguration> = {},
	): void {
		const next = { ...this.configuration, ...configuration };
		// An option that is passed as `undefined` keeps its value.
		next.transports ??= this.configuration.transports;
		next.connectTimeout ??= this.configuration.connectTimeout;

		if (
			!Array.isArray(next.transports) ||
			next.transports.length === 0 ||
			!next.transports.every((transport) => TRANSPORTS.includes(transport))
		) {
			throw new Error(
				`transports must list at least one of: ${TRANSPORTS.join(", ")}`,
			);
		}
		if (
			typeof next.connectTimeout !== "number" ||
			!(next.connectTimeout >= 1 && next.connectTimeout <= MAX_TIMEOUT)
		) {
			throw new Error(
				`connectTimeout must be a number between 1 and ${MAX_TIMEOUT}`,
			);
		}

		this.configuration = next;

		if (!this.configuration.autoConnect) {
			this.shouldConnect = false;
		}
	}

	cancelWebsocketRetry?: () => void;

	reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

	clearReconnectTimeout() {
		if (this.reconnectTimeout) {
			clearTimeout(this.reconnectTimeout);
			this.reconnectTimeout = null;
		}
	}

	async connect() {
		if (this.status === WebSocketStatus.Connected) {
			return;
		}

		this.clearReconnectTimeout();

		// Always cancel any previously initiated connection retryer instances
		if (this.cancelWebsocketRetry) {
			this.cancelWebsocketRetry();
			this.cancelWebsocketRetry = undefined;
		}

		this.receivedOnOpenPayload = undefined;
		this.shouldConnect = true;

		const abortableRetry = () => {
			let cancelAttempt = false;

			const retryPromise = retry(this.createWebSocketConnection.bind(this), {
				delay: this.configuration.delay,
				initialDelay: this.configuration.initialDelay,
				factor: this.configuration.factor,
				maxAttempts: this.configuration.maxAttempts,
				minDelay: this.configuration.minDelay,
				maxDelay: this.configuration.maxDelay,
				jitter: this.configuration.jitter,
				timeout: this.configuration.timeout,
				handleTimeout: this.configuration.handleTimeout,
				beforeAttempt: (context) => {
					if (!this.shouldConnect || cancelAttempt) {
						context.abort();
					}
				},
			}).catch((error: any) => {
				// If we aborted the connection attempt then don’t report a failure
				// ref: https://github.com/lifeomic/attempt/blob/master/src/index.ts#L136
				if (error?.code !== "ATTEMPT_ABORTED") {
					// connect() is fire-and-forget; rethrowing becomes an unhandled rejection.
					this.emit("maxAttemptsFailed", { error });
				}
			});

			return {
				retryPromise,
				cancelFunc: () => {
					cancelAttempt = true;
				},
			};
		};

		const { retryPromise, cancelFunc } = abortableRetry();
		this.cancelWebsocketRetry = cancelFunc;

		return retryPromise;
	}

	/**
	 * Listen to the given socket. Before it opens, a socket that fails moves the
	 * connection attempt on to the `remaining` transports without emitting
	 * `close`, `disconnect` or `status`.
	 */
	// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
	attachWebSocketListeners(
		ws: HocusPocusWebSocket,
		reject: Function,
		transport: HocuspocusTransport = "websocket",
		remaining: HocuspocusTransport[] = [],
	) {
		const { identifier } = ws;
		let opened = false;
		let receivedMessage = false;

		// The socket failed. Returns whether the connection attempt moved on to
		// the next transport; if not, the caller reports the failure.
		const failOver = () => {
			if (!receivedMessage) {
				this.markTransportFailed(transport);
			}
			if (opened || remaining.length === 0 || !this.shouldConnect) {
				return false;
			}

			this.cleanupWebSocket();
			try {
				this.openTransport(remaining, reject);
			} catch (error) {
				reject(error);
			}
			return true;
		};

		const onMessageHandler = (payload: any) => {
			if (!receivedMessage) {
				receivedMessage = true;
				this.clearConnectTimer();
				this.failedTransports.delete(transport);
			}
			this.emit("message", payload);
		};
		const onCloseHandler = (payload: any) => {
			// 1006 says that the connection failed. Any other code is a decision
			// of the server, which the next transport would get as well.
			if (payload?.code === 1006 && failOver()) {
				return;
			}
			this.emit("close", { event: payload });
		};
		const onOpenHandler = (payload: any) => {
			opened = true;
			this.clearConnectTimer();
			this.emit("open", payload);
		};
		const onErrorHandler = (err: any) => {
			if (failOver()) {
				return;
			}
			reject(err);
		};

		this.webSocketHandlers[identifier] = {
			message: onMessageHandler,
			close: onCloseHandler,
			open: onOpenHandler,
			error: onErrorHandler,
		};

		const handlers = this.webSocketHandlers[ws.identifier];

		Object.keys(handlers).forEach((name) => {
			ws.addEventListener(name, handlers[name]);
		});

		// HTTP sockets enforce their own deadline; a WebSocket-only configuration
		// waits for the socket as long as it takes.
		if (transport === "websocket" && this.configuration.transports.length > 1) {
			this.armConnectTimer(this.configuration.connectTimeout);
		}
	}

	private markTransportFailed(transport: HocuspocusTransport) {
		// A socket that fails because of disconnect() (e.g. a WebSocket closed
		// while connecting reports 1006) says nothing about the transport, and
		// must not undo the reset disconnect() did.
		if (!this.shouldConnect) {
			return;
		}
		this.failedTransports.set(transport, Date.now() + FAILED_TRANSPORT_TTL);
	}

	/**
	 * Give the current WebSocket `delay` ms, after which it counts as failed:
	 * its `close` listener is called as if it had closed with 1006. The timer
	 * never outlives its socket, `cleanupWebSocket` clears it.
	 */
	private armConnectTimer(delay: number) {
		this.clearConnectTimer();
		this.connectTimer = setTimeout(() => {
			this.connectTimer = null;
			if (this.webSocket) {
				this.webSocketHandlers[this.webSocket.identifier]?.close({
					code: 1006,
					reason: "Connect timeout",
				});
			}
		}, delay);
	}

	/**
	 * A WebSocket whose upgrade passes but whose frames are dropped never
	 * answers, and would be waited for forever. So with other transports to
	 * turn to, a WebSocket that was sent something has `messageReconnectTimeout`
	 * to deliver its first message.
	 */
	private expectFirstMessage() {
		if (
			this.connectionAttempt &&
			!this.connectTimer &&
			this.transport === "websocket" &&
			this.configuration.transports.length > 1
		) {
			this.armConnectTimer(this.configuration.messageReconnectTimeout);
		}
	}

	private clearConnectTimer() {
		if (this.connectTimer) {
			clearTimeout(this.connectTimer);
			this.connectTimer = null;
		}
	}

	/**
	 * Transports for one connection attempt: the configured ones, without those
	 * that failed recently. If every one failed recently, all of them, the one
	 * that failed longest ago first: a WebSocket that opens but delivers nothing
	 * cannot fail over within its attempt, and must not be retried first
	 * forever while the HTTP transports wait behind it.
	 */
	private transportCandidates(): HocuspocusTransport[] {
		const now = Date.now();
		const candidates = this.configuration.transports.filter(
			(transport) => (this.failedTransports.get(transport) ?? 0) <= now,
		);
		if (candidates.length > 0) {
			return candidates;
		}

		return [...this.configuration.transports].sort(
			(a, b) =>
				(this.failedTransports.get(a) ?? 0) -
				(this.failedTransports.get(b) ?? 0),
		);
	}

	/**
	 * Create a socket for the first candidate. A constructor that throws moves
	 * on to the next candidate; with none left the error propagates.
	 */
	// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
	private openTransport(candidates: HocuspocusTransport[], reject: Function) {
		const [transport, ...rest] = candidates;
		this.identifier += 1;

		let ws: any;
		try {
			ws =
				transport === "websocket"
					? new this.configuration.WebSocketPolyfill(this.url)
					: new HttpSocket(this.url, {
							transport,
							connectTimeout: this.configuration.connectTimeout,
						});
		} catch (error) {
			if (rest.length === 0) {
				throw error;
			}
			this.markTransportFailed(transport);
			this.openTransport(rest, reject);
			return;
		}

		ws.binaryType = "arraybuffer";
		ws.identifier = this.identifier;
		this.transport = transport;

		this.attachWebSocketListeners(ws, reject, transport, rest);

		this.webSocket = ws;
	}

	cleanupWebSocket() {
		this.clearConnectTimer();

		if (!this.webSocket) {
			return;
		}
		const { identifier } = this.webSocket;
		const handlers = this.webSocketHandlers[identifier];

		Object.keys(handlers).forEach((name) => {
			this.webSocket?.removeEventListener(name, handlers[name]);
			delete this.webSocketHandlers[identifier];
		});
		this.webSocket.close();
		this.webSocket = null;
		this.transport = null;
	}

	createWebSocketConnection() {
		return new Promise((resolve, reject) => {
			if (this.webSocket) {
				this.messageQueue = [];
				this.cleanupWebSocket();
			}
			this.lastMessageReceived = 0;

			this.openTransport(this.transportCandidates(), reject);

			// Reset the status
			this.status = WebSocketStatus.Connecting;
			this.emit("status", { status: WebSocketStatus.Connecting });

			// Store resolve/reject for later use
			this.connectionAttempt = {
				resolve,
				reject,
			};
		});
	}

	onMessage(event: MessageEvent) {
		this.resolveConnectionAttempt();

		this.lastMessageReceived = time.getUnixTime();

		const data = new Uint8Array(event.data as ArrayBuffer);

		// Check for connection-level Ping message (no document name prefix)
		// Ping messages are sent as just the message type byte (length 1)
		// We check length to avoid confusing with regular messages that happen to have
		// a document name length of 9 as the first byte
		if (data.length === 1 && data[0] === MessageType.Ping) {
			this.sendPong();
			return;
		}

		const message = new IncomingMessage(data);
		const rawKey = message.peekVarString();

		const provider = this.configuration.providerMap.get(rawKey);
		provider?.onMessage(event);
	}

	/**
	 * Send application-level Pong response to server Ping
	 */
	private sendPong() {
		const encoder = encoding.createEncoder();
		encoding.writeVarUint(encoder, MessageType.Pong);
		this.send(encoding.toUint8Array(encoder));
	}

	resolveConnectionAttempt() {
		if (this.connectionAttempt) {
			this.cancelWebsocketRetry = undefined;
			this.connectionAttempt.resolve();
			this.connectionAttempt = null;

			this.status = WebSocketStatus.Connected;
			this.emit("status", { status: WebSocketStatus.Connected });
			this.emit("connect");
			this.messageQueue.forEach((message) => this.send(message));
			this.messageQueue = [];
		}
	}

	stopConnectionAttempt() {
		this.connectionAttempt = null;
	}

	rejectConnectionAttempt(reason?: unknown) {
		this.connectionAttempt?.reject(reason);
		this.connectionAttempt = null;
	}

	closeTries = 0;

	checkConnection() {
		// Don’t check the connection when it’s not even established
		if (this.status !== WebSocketStatus.Connected) {
			return;
		}

		// Don’t close the connection while waiting for the first message
		if (!this.lastMessageReceived) {
			return;
		}

		// Don’t close the connection when a message was received recently
		if (
			this.configuration.messageReconnectTimeout >=
			time.getUnixTime() - this.lastMessageReceived
		) {
			return;
		}

		// No message received in a long time, not even your own
		// Awareness updates, which are updated every 15 seconds
		// if awareness is enabled.
		this.closeTries += 1;
		// https://bugs.webkit.org/show_bug.cgi?id=247943
		if (this.closeTries > 2) {
			this.emit("close", {
				event: {
					code: 4408,
					reason: "forced",
				},
			});
			this.closeTries = 0;
		} else {
			this.webSocket?.close();
			this.messageQueue = [];
		}
	}

	get serverUrl() {
		if (this.configuration.preserveTrailingSlash) {
			return this.configuration.url;
		}

		// By default, ensure that the URL never ends with /
		let url = this.configuration.url;
		while (url[url.length - 1] === "/") {
			url = url.slice(0, url.length - 1);
		}

		return url;
	}

	get url() {
		return this.serverUrl;
	}

	disconnect() {
		// An explicit reconnect starts from the first transport again.
		this.clearConnectTimer();
		this.failedTransports.clear();

		this.shouldConnect = false;
		this.clearReconnectTimeout();

		if (this.webSocket === null) {
			return;
		}

		try {
			this.webSocket.close();
			this.messageQueue = [];
		} catch (e) {
			console.error(e);
		}
	}

	private parseQueuedMessage(
		message: Uint8Array,
	): { documentName: string; messageType: number } | null {
		try {
			const decoder = createDecoder(message);
			const documentName = readVarString(decoder);
			const messageType = readVarUint(decoder);
			return { documentName, messageType };
		} catch {
			return null;
		}
	}

	private addToQueue(message: any) {
		if (message instanceof Uint8Array) {
			const parsed = this.parseQueuedMessage(message);
			if (
				parsed &&
				HocuspocusProviderWebsocket.DEDUPLICATABLE_TYPES.has(parsed.messageType)
			) {
				this.messageQueue = this.messageQueue.filter((queued) => {
					if (!(queued instanceof Uint8Array)) return true;
					const queuedParsed = this.parseQueuedMessage(queued);
					if (!queuedParsed) return true;
					return !(
						queuedParsed.documentName === parsed.documentName &&
						queuedParsed.messageType === parsed.messageType
					);
				});
			}
		}
		this.messageQueue.push(message);
	}

	send(message: any) {
		if (this.webSocket?.readyState === WsReadyStates.Open) {
			this.webSocket.send(message);
			this.expectFirstMessage();
		} else {
			this.addToQueue(message);
		}
	}

	onClose({ event }: onCloseParameters) {
		this.closeTries = 0;
		this.cleanupWebSocket();

		if (this.connectionAttempt) {
			// That connection attempt failed. The socket can close without ever
			// emitting an error, so pass a reason along – it ends up as the error
			// of the `maxAttemptsFailed` event once the retries are exhausted.
			this.rejectConnectionAttempt(
				new Error(
					`WebSocket closed before the connection was established (code: ${event?.code}, reason: ${event?.reason || "none"})`,
				),
			);
		}

		// Let’s update the connection status.
		this.status = WebSocketStatus.Disconnected;
		this.emit("status", { status: WebSocketStatus.Disconnected });
		this.emit("disconnect", { event });

		// trigger connect if no retry is running and we want to have a connection
		if (!this.cancelWebsocketRetry && this.shouldConnect) {
			this.reconnectTimeout = setTimeout(() => {
				this.reconnectTimeout = null;
				this.connect();
			}, this.configuration.delay);
		}
	}

	destroy() {
		this.emit("destroy");

		clearInterval(this.intervals.connectionChecker);

		// If there is still a connection attempt outstanding then we should stop
		// it before calling disconnect, otherwise it will be rejected in the onClose
		// handler and trigger a retry
		this.stopConnectionAttempt();

		this.disconnect();

		this.removeAllListeners();

		this.cleanupWebSocket();
	}
}
