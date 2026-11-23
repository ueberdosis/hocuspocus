import {
	HTTP_TRANSPORT_PROBE,
	HttpTransportEvent,
	type HttpTransportName,
	type HttpTransportOpenPayload,
	HttpTransportParameter,
	WsReadyStates,
} from "@hocuspocus/common";
import { fromBase64, toBase64 } from "lib0/buffer";
import { uuidv4 } from "lib0/random";

const RETRY_BASE_DELAY = 250;
const RETRY_MAX_DELAY = 5_000;

// Browsers cap the bodies of all in-flight keepalive requests at 64 KiB.
const KEEPALIVE_MAX_BODY = 60_000;

// The slowest upload a POST is given time for, in bytes per second.
const MIN_UPLOAD_RATE = 16 * 1024;

type Listener = (event: unknown) => void;

interface StreamEvent {
	event: string | null;
	id: string | null;
	data: string | null;
}

type StreamItem = { comment: string } | StreamEvent;

/** Replaces the deadline of a request with one `timeout` ms from now. */
type Watchdog = (timeout: number) => void;

/** Receives the response of a request. */
type Consume<T> = (response: Response, watchdog: Watchdog) => Promise<T>;

/** A run of failed requests in one direction. */
interface RetryState {
	failingSince: number | null;
	attempt: number;
}

/**
 * Parse what `HttpFallback` writes downstream, which is valid
 * `text/event-stream` with `\n` line endings. The text arrives in arbitrary
 * chunks; comments and events are reported in order.
 */
function createEventStreamParser(
	onItem: (item: StreamItem) => void,
): (text: string) => void {
	// The line that has not ended yet, in the pieces it arrived in. They are
	// joined once the line ends: appending each chunk to one string would copy
	// a large message again with every chunk.
	const pieces: string[] = [];
	let event: string | null = null;
	let id: string | null = null;
	let data: string | null = null;

	const parseLine = (line: string) => {
		// A blank line ends an event.
		if (line === "") {
			if (event !== null || id !== null || data !== null) {
				onItem({ event, id, data });
			}
			event = null;
			id = null;
			data = null;
			return;
		}

		if (line.startsWith(":")) {
			onItem({ comment: line.slice(1) });
			return;
		}

		const colon = line.indexOf(":");
		const field = colon === -1 ? line : line.slice(0, colon);
		// A space after the colon belongs to the syntax, not to the value.
		const value =
			colon === -1
				? ""
				: line.slice(line[colon + 1] === " " ? colon + 2 : colon + 1);

		if (field === "event") {
			event = value;
		} else if (field === "id") {
			id = value;
		} else if (field === "data") {
			data = data === null ? value : `${data}\n${value}`;
		}
	};

	return (text) => {
		let start = 0;
		for (
			let end = text.indexOf("\n");
			end !== -1;
			end = text.indexOf("\n", start)
		) {
			pieces.push(text.slice(start, end));
			parseLine(pieces.join(""));
			pieces.length = 0;
			start = end + 1;
		}
		if (start < text.length) {
			pieces.push(text.slice(start));
		}
	};
}

/**
 * Read the body of a downstream response to its end and report its items.
 * `onChunk` runs after every chunk of the body.
 */
async function readItems(
	response: Response,
	onItem: (item: StreamItem) => void,
	onChunk: () => void,
): Promise<void> {
	if (!response.body) {
		throw new Error("Response without a body");
	}

	const parse = createEventStreamParser(onItem);
	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	while (true) {
		const { done, value } = await reader.read();
		if (done) {
			return;
		}
		parse(decoder.decode(value, { stream: true }));
		onChunk();
	}
}

function parseCloseEvent(text: string): { code: number; reason: string } {
	try {
		const { code, reason } = JSON.parse(text);
		if (typeof code === "number") {
			return { code, reason: typeof reason === "string" ? reason : "" };
		}
	} catch {
		// Fall through.
	}
	return { code: 1006, reason: "Invalid close event" };
}

function isPositive(value: unknown): value is number {
	return typeof value === "number" && value > 0 && Number.isFinite(value);
}

/** Why a request failed. `fetch` often keeps the actual reason in `cause`. */
function reasonOf(error: unknown): string {
	if (!(error instanceof Error)) {
		return String(error);
	}
	return error.cause instanceof Error
		? `${error.message}: ${error.cause.message}`
		: error.message;
}

/**
 * Client side of the HTTP fallback transports of `@hocuspocus/server`
 * (`HttpFallback`): server-sent events or long-polling downstream, POST
 * upstream. Presents the subset of the browser `WebSocket` that
 * `HocuspocusProviderWebsocket` uses.
 *
 * Uses `fetch` with a stream reader instead of `EventSource`, which cannot
 * POST, hides the status code and is not a global in Node.js.
 *
 * Nothing here runs on a timer of its own: browsers throttle timers in
 * background tabs. Timers only bound how long a request or a retry may take.
 */
export class HttpSocket {
	binaryType = "arraybuffer";

	identifier = 0;

	readyState: number = WsReadyStates.Connecting;

	private readonly url: string;

	private readonly transport: HttpTransportName;

	private readonly connectTimeout: number;

	private readonly sessionId = uuidv4();

	private readonly listeners = new Map<string, Set<Listener>>();

	/** The requests in flight; aborted when the socket closes. */
	private readonly controllers = new Set<AbortController>();

	/** The retries that wait for their delay; dropped when the socket closes. */
	private readonly retryTimers = new Set<ReturnType<typeof setTimeout>>();

	/** The secret of the session; empty until the server has told it. */
	private key = "";

	private heartbeatInterval = 0;

	private maxPayload = 0;

	/** Highest downstream message id processed. */
	private cursor = 0;

	/** Sequence number of the last batch the server accepted. */
	private sendSeq = 0;

	/** The messages that wait for the next POST, base64 encoded. */
	private queue: string[] = [];

	private flushScheduled = false;

	/** A batch of messages is on its way, or waits to be sent again. */
	private posting = false;

	/** A ping is on its way. */
	private pinging = false;

	/**
	 * When the last ping went out, or the event stream that is read began: the
	 * request for it acknowledged the cursor too.
	 */
	private pingedAt = 0;

	private readonly downstreamRetry: RetryState = {
		failingSince: null,
		attempt: 0,
	};

	private readonly upstreamRetry: RetryState = {
		failingSince: null,
		attempt: 0,
	};

	constructor(
		url: string,
		options: { transport: HttpTransportName; connectTimeout: number },
	) {
		// As a WebSocket does, resolve a relative URL against the page, in a
		// worker against its script. Elsewhere there is neither, and the URL has
		// to be absolute.
		const page: {
			document?: { baseURI?: string };
			location?: { href?: string };
		} = globalThis;
		const resolved = new URL(
			url,
			page.document?.baseURI ?? page.location?.href,
		);
		resolved.protocol = resolved.protocol.replace("ws", "http");
		this.url = resolved.href;
		this.transport = options.transport;
		this.connectTimeout = options.connectTimeout;

		if (this.transport === "sse") {
			void this.stream();
		} else {
			void this.poll();
		}
	}

	addEventListener(type: string, listener: Listener): void {
		let listeners = this.listeners.get(type);
		if (!listeners) {
			listeners = new Set();
			this.listeners.set(type, listeners);
		}
		listeners.add(listener);
	}

	removeEventListener(type: string, listener: Listener): void {
		this.listeners.get(type)?.delete(listener);
	}

	send(data: Uint8Array | ArrayBuffer): void {
		if (this.readyState !== WsReadyStates.Open) {
			return;
		}

		this.queue.push(
			toBase64(data instanceof Uint8Array ? data : new Uint8Array(data)),
		);

		// One POST for all the messages of this tick.
		if (!this.flushScheduled) {
			this.flushScheduled = true;
			queueMicrotask(() => {
				this.flushScheduled = false;
				this.pump();
			});
		}
	}

	close(code?: number, reason?: string): void {
		this.finish(code ?? 1005, reason ?? "", true);
	}

	private get closed(): boolean {
		return this.readyState === WsReadyStates.Closed;
	}

	private dispatch(type: string, event: unknown): void {
		for (const listener of this.listeners.get(type) ?? []) {
			try {
				listener(event);
			} catch (error) {
				// As with a WebSocket, a listener that throws is reported and does
				// not break the socket.
				queueMicrotask(() => {
					throw error;
				});
			}
		}
	}

	private requestUrl(parameters: Record<string, string | number>): URL {
		const url = new URL(this.url);
		url.searchParams.set(HttpTransportParameter.SessionId, this.sessionId);
		for (const [name, value] of Object.entries(parameters)) {
			url.searchParams.set(name, String(value));
		}
		return url;
	}

	/**
	 * Send a request and hand its response to `consume`. The request, with its
	 * response body, is aborted when the socket closes and when its deadline
	 * passes: `timeout` ms from now, unless `consume` moves it.
	 */
	private async request<T>(
		parameters: Record<string, string | number>,
		init: RequestInit,
		timeout: number,
		consume: Consume<T>,
	): Promise<T> {
		const controller = new AbortController();
		this.controllers.add(controller);
		let timer: ReturnType<typeof setTimeout> | undefined;
		const watchdog = (delay: number) => {
			clearTimeout(timer);
			timer = setTimeout(
				() => controller.abort(new Error("Request timed out")),
				delay,
			);
		};
		watchdog(timeout);

		try {
			const response = await fetch(this.requestUrl(parameters), {
				...init,
				// A redirect would hand the key, and the token that travels with
				// it, to another address.
				redirect: "error",
				signal: controller.signal,
			});
			return await consume(response, watchdog);
		} finally {
			clearTimeout(timer);
			// Releases a response body that was not read to its end.
			controller.abort();
			this.controllers.delete(controller);
		}
	}

	/**
	 * Request a downstream response: with the GET that opens the session, or
	 * with a POST that proves the key and resumes after the cursor.
	 */
	private requestDownstream<T>(
		timeout: number,
		consume: Consume<T>,
	): Promise<T> {
		const transport = { [HttpTransportParameter.Transport]: this.transport };

		return this.key === ""
			? this.request(transport, {}, timeout, consume)
			: this.request(
					{ ...transport, [HttpTransportParameter.Cursor]: this.cursor },
					{ method: "POST", body: this.key },
					timeout,
					consume,
				);
	}

	/**
	 * Close the socket, once: abort every request, optionally tell the server,
	 * then dispatch `error` (only for a socket that failed to open) and `close`.
	 */
	private finish(code: number, reason: string, notifyServer: boolean): void {
		if (this.closed) {
			return;
		}

		const wasConnecting = this.readyState === WsReadyStates.Connecting;
		this.readyState = WsReadyStates.Closed;

		for (const controller of this.controllers) {
			controller.abort();
		}
		for (const timer of this.retryTimers) {
			clearTimeout(timer);
		}
		this.retryTimers.clear();

		if (notifyServer && this.key !== "") {
			fetch(this.requestUrl({ [HttpTransportParameter.Close]: 1 }), {
				method: "POST",
				body: this.key,
				keepalive: true,
				redirect: "error",
			}).catch(() => {});
		}

		queueMicrotask(() => {
			if (wasConnecting && code === 1006) {
				this.dispatch("error", new Error(reason));
			}
			this.dispatch("close", { type: "close", code, reason });
		});
	}

	/**
	 * A request failed. Before the socket has opened that is final, so the
	 * provider can move on to its next transport. Afterwards the request is
	 * repeated, with growing delays, until requests have been failing for
	 * `connectTimeout`.
	 */
	private retry(state: RetryState, error: unknown, again: () => void): void {
		if (this.closed) {
			return;
		}

		const now = Date.now();
		state.failingSince ??= now;
		if (
			this.readyState !== WsReadyStates.Open ||
			now - state.failingSince >= this.connectTimeout
		) {
			this.finish(1006, reasonOf(error), true);
			return;
		}

		const delay =
			Math.random() *
			Math.min(RETRY_MAX_DELAY, RETRY_BASE_DELAY * 2 ** state.attempt);
		state.attempt += 1;
		const timer = setTimeout(() => {
			this.retryTimers.delete(timer);
			again();
		}, delay);
		this.retryTimers.add(timer);
	}

	private resetRetry(state: RetryState): void {
		state.failingSince = null;
		state.attempt = 0;
	}

	/**
	 * Throws unless the response has the expected status. A status that says
	 * the session of an open socket is over closes the socket first; any other
	 * failure is left to `retry`.
	 */
	private async checkStatus(
		response: Response,
		expected: number,
	): Promise<void> {
		const { status } = response;
		if (status === expected) {
			return;
		}

		if (this.readyState === WsReadyStates.Open) {
			if (status === 404) {
				this.finish(1006, "Session not found", false);
			} else if (status === 410) {
				const { code, reason } = parseCloseEvent(
					await response.text().catch(() => ""),
				);
				this.finish(code, reason, false);
			} else if (status === 413) {
				this.finish(1009, "Message Too Big", true);
			} else if (status >= 400 && status < 500) {
				this.finish(1006, `Unexpected status ${status}`, true);
			}
		}

		throw new Error(`Unexpected status ${status}`);
	}

	private open(): void {
		this.readyState = WsReadyStates.Open;
		this.dispatch("open", { type: "open" });
	}

	private readOpenPayload(data: string | null): void {
		const {
			key,
			heartbeatInterval,
			maxPayload,
		}: Partial<HttpTransportOpenPayload> = JSON.parse(data ?? "null") ?? {};
		if (
			typeof key !== "string" ||
			key === "" ||
			!isPositive(heartbeatInterval) ||
			!isPositive(maxPayload)
		) {
			throw new Error("Invalid open event");
		}

		this.key = key;
		this.heartbeatInterval = heartbeatInterval;
		this.maxPayload = maxPayload;
	}

	/**
	 * Handle an event of a downstream response. Throws when it breaks the
	 * protocol; the request then counts as failed.
	 */
	private handleEvent({ event, id, data }: StreamEvent): void {
		// Nothing is dispatched after the socket closed, be it by a close event.
		if (this.closed) {
			return;
		}

		if (event === HttpTransportEvent.Open) {
			if (this.key === "") {
				this.readOpenPayload(data);
				// An event stream has to deliver its probe first.
				if (this.transport === "polling") {
					this.open();
				}
			}
			return;
		}

		if (event === HttpTransportEvent.Close) {
			const { code, reason } = parseCloseEvent(data ?? "");
			this.finish(code, reason, false);
			return;
		}

		// Not a message: an event this version does not know.
		if (event !== null || id === null || data === null) {
			return;
		}

		if (this.readyState !== WsReadyStates.Open) {
			throw new Error("Message before the session opened");
		}

		// Processed before: the server repeats what a lost response carried.
		const messageId = Number(id);
		if (!(messageId > this.cursor)) {
			return;
		}

		let message: Uint8Array;
		try {
			message = fromBase64(data);
		} catch {
			this.finish(1006, "Invalid message", true);
			return;
		}

		this.cursor = messageId;
		this.dispatch("message", { type: "message", data: message.buffer });
	}

	/**
	 * Keep an event stream open. The first one opens the session, later ones
	 * resume it after the cursor.
	 */
	private async stream(): Promise<void> {
		try {
			await this.requestDownstream(this.connectTimeout, (response, watchdog) =>
				this.readStream(response, watchdog),
			);
		} catch (error) {
			this.retry(this.downstreamRetry, error, () => this.stream());
		}
	}

	/**
	 * Process an event stream until it fails; it does not end otherwise.
	 *
	 * The socket only opens once the stream has delivered the probe, which the
	 * server writes a moment after the start: a proxy that buffers the response
	 * never gets there, and the provider moves on to long-polling.
	 */
	private async readStream(
		response: Response,
		watchdog: Watchdog,
	): Promise<never> {
		await this.checkStatus(response, 200);
		// A server without the HTTP transports answers with a greeting.
		if (
			!response.headers.get("content-type")?.startsWith("text/event-stream")
		) {
			throw new Error("Not an event stream");
		}

		// How long the stream may stay silent. Once its probe proved that nothing
		// buffers it, that is the time between two heartbeats.
		let patience = this.connectTimeout;
		this.pingedAt = Date.now();

		await readItems(
			response,
			(item) => {
				if (!("comment" in item)) {
					this.handleEvent(item);
				} else if (item.comment === HTTP_TRANSPORT_PROBE) {
					if (this.readyState === WsReadyStates.Connecting) {
						if (this.key === "") {
							throw new Error("Event stream did not open a session");
						}
						this.open();
					}
					patience = this.heartbeatInterval + this.connectTimeout;
					this.resetRetry(this.downstreamRetry);
				} else if (item.comment === "") {
					// A heartbeat.
					void this.ping();
				}
			},
			() => {
				// A transport has `connectTimeout` to open, however its bytes
				// arrive: until then the deadline of the request stands. After
				// that the stream only has to keep arriving.
				if (this.readyState === WsReadyStates.Open) {
					watchdog(patience);
				}
				// The heartbeats written during a long message wait behind it, and
				// with them the pings that acknowledge the messages before it.
				// Ping as often as heartbeats arrive otherwise.
				if (Date.now() - this.pingedAt >= this.heartbeatInterval) {
					void this.ping();
				}
			},
		);

		throw new Error("Event stream ended");
	}

	/**
	 * Request the messages after the cursor, again and again. The server holds
	 * a poll until it has something to say, a heartbeat at the least. The first
	 * poll opens the session.
	 */
	private async poll(): Promise<void> {
		try {
			await this.requestDownstream(
				this.key === ""
					? this.connectTimeout
					: this.heartbeatInterval + this.connectTimeout,
				(response, watchdog) => this.readPoll(response, watchdog),
			);
			this.resetRetry(this.downstreamRetry);
		} catch (error) {
			this.retry(this.downstreamRetry, error, () => this.poll());
			return;
		}

		if (!this.closed) {
			void this.poll();
		}
	}

	private async readPoll(
		response: Response,
		watchdog: Watchdog,
	): Promise<void> {
		await this.checkStatus(response, 200);

		let items = 0;
		await readItems(
			response,
			(item) => {
				items += 1;
				if (!("comment" in item)) {
					this.handleEvent(item);
				}
			},
			// The hold is over: from here on the body has to keep arriving. The
			// poll that opens the session keeps its deadline until it has.
			() => {
				if (this.readyState === WsReadyStates.Open) {
					watchdog(this.connectTimeout);
				}
			},
		);

		// What a server without the HTTP transports, or a proxy, answers.
		if (items === 0) {
			throw new Error("Not a poll response");
		}
		if (this.readyState === WsReadyStates.Connecting) {
			throw new Error("Poll did not open a session");
		}
	}

	/** Start a POST with the queued messages, unless one is on its way. */
	private pump(): void {
		if (this.posting || this.readyState !== WsReadyStates.Open) {
			return;
		}

		// As many of the queued messages as fit into one body.
		let size = this.key.length;
		let count = 0;
		while (
			count < this.queue.length &&
			size + 1 + this.queue[count].length <= this.maxPayload
		) {
			size += 1 + this.queue[count].length;
			count += 1;
		}

		if (count === 0) {
			if (this.queue.length > 0) {
				this.finish(1009, "Message Too Big", true);
			}
			return;
		}

		this.posting = true;
		void this.post(this.queue.splice(0, count));
	}

	/**
	 * POST a batch of messages until the server has accepted it. Then send
	 * what has been queued in the meantime.
	 */
	private async post(lines: string[]): Promise<void> {
		const body = [this.key, ...lines].join("\n");

		try {
			await this.request(
				{
					[HttpTransportParameter.Cursor]: this.cursor,
					// The server ignores a sequence number it has processed, so a
					// batch that is repeated because its response got lost is not
					// delivered twice.
					[HttpTransportParameter.Sequence]: this.sendSeq + 1,
				},
				{ method: "POST", body, keepalive: body.length <= KEEPALIVE_MAX_BODY },
				// A large body takes its time on a slow connection.
				this.connectTimeout + (body.length / MIN_UPLOAD_RATE) * 1000,
				(response) => this.checkStatus(response, 204),
			);
		} catch (error) {
			this.retry(this.upstreamRetry, error, () => this.post(lines));
			return;
		}

		this.sendSeq += 1;
		this.resetRetry(this.upstreamRetry);
		this.posting = false;
		this.pump();
	}

	/**
	 * Answer a heartbeat of the event stream: the request tells the server
	 * that the client is alive, and what it has processed. It does not wait for
	 * a batch that is on its way, which can take long on a slow connection.
	 */
	private async ping(): Promise<void> {
		if (this.pinging || this.readyState !== WsReadyStates.Open) {
			return;
		}

		this.pinging = true;
		this.pingedAt = Date.now();
		try {
			await this.request(
				{ [HttpTransportParameter.Cursor]: this.cursor },
				{ method: "POST", body: this.key },
				this.connectTimeout,
				(response) => this.checkStatus(response, 204),
			);
		} catch {
			// The next heartbeat brings the next ping. A session that gets none
			// through is closed by the server.
		} finally {
			this.pinging = false;
		}
	}
}
