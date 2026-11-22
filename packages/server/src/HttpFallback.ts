import type { IncomingMessage, ServerResponse } from "node:http";
import {
	type CloseEvent,
	ConnectionTimeout,
	HTTP_TRANSPORT_PROBE,
	HttpTransportEvent,
	type HttpTransportName,
	type HttpTransportOpenPayload,
	HttpTransportParameter,
	ResetConnection,
	WsReadyStates,
} from "@hocuspocus/common";
import { fromBase64, toBase64 } from "lib0/buffer";
import type { ClientConnection } from "./ClientConnection.ts";
import type { Hocuspocus } from "./Hocuspocus.ts";
import type { WebSocketLike } from "./types.ts";
import { toWebRequest, writeWebResponse } from "./util/nodeHttp.ts";

export interface HttpFallbackConfiguration {
	/**
	 * Browser origins allowed to use the HTTP transports. "*" allows any origin
	 * without credentials. With a list, requests from other origins get 403, the
	 * app's own origin included if it is not listed. Set a list when hooks
	 * authenticate with cookies.
	 */
	allowedOrigins: "*" | string[];
	/** Send Access-Control-Allow-Credentials. Requires a list in allowedOrigins. */
	allowCredentials: boolean;
	/** Interval of SSE keep-alive comments and longest time a poll is held, in ms. */
	heartbeatInterval: number;
	/** Largest accepted POST body in bytes. */
	maxPayload: number;
	/**
	 * Sessions held in memory. At the limit a new session replaces the oldest
	 * one that has not authenticated; if all have, it is refused with 503.
	 */
	maxSessions: number;
}

export const defaultHttpFallbackConfiguration: HttpFallbackConfiguration = {
	allowedOrigins: "*",
	allowCredentials: false,
	heartbeatInterval: 25_000,
	maxPayload: 10 * 1024 * 1024,
	maxSessions: 10_000,
};

// Written first on every event stream, so proxies that buffer small responses
// flush the headers and the stream starts moving.
const SSE_PADDING = `:${" ".repeat(2048)}\n\n`;

// Delay of the probe comment after an event stream attaches. A client only
// opens once the probe arrived, which proves the path delivers data written
// after the first chunk while the response is still open.
const SSE_PROBE_DELAY = 50;

// How long a closed session still answers 410 with its close event.
const CLOSED_SESSION_TTL = 60_000;

const SESSION_ID = /^[A-Za-z0-9_-]{16,64}$/;
const INTEGER = /^\d{1,15}$/;

// Base64 alphabet followed by at most two padding characters. Combined with a
// length that is a multiple of four this accepts exactly the canonical
// encoding. A pattern with a repeated group would overflow the regex stack on
// multi-megabyte lines.
const BASE64 = /^[A-Za-z0-9+/]*={0,2}$/;

// Session keys are UUIDs; a longer first line is never a key.
const MAX_KEY_LENGTH = 64;

const textEncoder = new TextEncoder();

// `Document.broadcast` hands the same buffer to every connection, so a
// broadcast is encoded once, not once per session.
const encodedMessages = new WeakMap<Uint8Array, string>();

function encodeMessage(data: Uint8Array): string {
	let encoded = encodedMessages.get(data);
	if (encoded === undefined) {
		encoded = toBase64(data);
		encodedMessages.set(data, encoded);
	}
	return encoded;
}

function isTransport(value: string | null): value is HttpTransportName {
	return value === "sse" || value === "polling";
}

function isOrigin(entry: unknown): boolean {
	if (typeof entry !== "string" || entry === "null") {
		return false;
	}
	try {
		return new URL(entry).origin === entry;
	} catch {
		return false;
	}
}

// Compare without returning early, so the time taken does not reveal how many
// leading characters of a guessed key were right.
function keysEqual(candidate: string, key: string): boolean {
	if (candidate.length !== key.length) {
		return false;
	}
	let difference = 0;
	for (let index = 0; index < key.length; index += 1) {
		difference |= candidate.charCodeAt(index) ^ key.charCodeAt(index);
	}
	return difference === 0;
}

function textResponse(
	status: number,
	body: string,
	headers: Headers,
	contentType = "text/plain; charset=utf-8",
): Response {
	headers.set("Content-Type", contentType);
	return new Response(body, { status, headers });
}

/**
 * Read a POST body of at most `limit` bytes, split into lines. The first line
 * (the session key) is checked as soon as it is complete, so a sender without
 * the key cannot make the server buffer a large body. `lines` excludes it.
 */
async function readBody(
	request: Request,
	limit: number,
	acceptFirstLine: (line: string) => boolean,
): Promise<{ status: 200; lines: string[] } | { status: 404 | 413 }> {
	const declaredLength = request.headers.get("content-length");
	if (declaredLength !== null && Number(declaredLength) > limit) {
		return { status: 413 };
	}

	let text = "";
	let firstLineAccepted = false;

	if (request.body) {
		const reader = request.body.getReader();
		const decoder = new TextDecoder();
		let byteLength = 0;

		while (true) {
			const { done, value } = await reader.read();
			if (done) {
				break;
			}

			byteLength += value.byteLength;
			if (byteLength > limit) {
				reader.cancel().catch(() => {});
				return { status: 413 };
			}

			text += decoder.decode(value, { stream: true });

			if (!firstLineAccepted) {
				const end = text.indexOf("\n");
				const firstLine = end === -1 ? text : text.slice(0, end);
				if (
					firstLine.length > MAX_KEY_LENGTH ||
					(end !== -1 && !acceptFirstLine(firstLine))
				) {
					reader.cancel().catch(() => {});
					return { status: 404 };
				}
				firstLineAccepted = end !== -1;
			}
		}

		text += decoder.decode();
	}

	const lines = text.split("\n");
	if (
		!firstLineAccepted &&
		(lines[0].length > MAX_KEY_LENGTH || !acceptFirstLine(lines[0]))
	) {
		return { status: 404 };
	}

	return { status: 200, lines: lines.slice(1) };
}

interface OutboxEntry {
	seq: number;
	data: Uint8Array;
	at: number;
}

interface Downstream {
	mode: HttpTransportName;
	controller: ReadableStreamDefaultController<Uint8Array>;
	timeout?: ReturnType<typeof setTimeout>;
	interval?: ReturnType<typeof setInterval>;
}

interface ClosedSession {
	key: string;
	closeEvent: CloseEvent;
	timer: ReturnType<typeof setTimeout>;
}

/**
 * One client of the HTTP transports, presented to Hocuspocus as a WebSocket.
 * Outgoing messages are numbered and kept until the client acknowledges them,
 * so a cut event stream or a lost poll response is replayed.
 */
class Session implements WebSocketLike {
	readonly key = crypto.randomUUID();

	readyState: number = WsReadyStates.Open;

	clientConnection!: ClientConnection;

	nextSeq = 1;

	acked = 0;

	received = 0;

	private outbox: OutboxEntry[] = [];

	private written = 0;

	private pendingText = "";

	private downstream: Downstream | null = null;

	private flushScheduled = false;

	private closeEvent: CloseEvent | null = null;

	private readonly heartbeat: number;

	private readonly unackedTimeout: number;

	constructor(
		readonly id: string,
		private readonly maxPayload: number,
		heartbeatInterval: number,
		timeout: number,
		private readonly onClosed: (
			session: Session,
			closeEvent: CloseEvent | null,
		) => void,
	) {
		// Clients ping on every heartbeat, so a heartbeat of at most half the
		// idle timeout keeps a healthy session alive.
		this.heartbeat = Math.min(
			heartbeatInterval,
			Math.max(1, Math.floor(timeout / 2)),
		);
		this.unackedTimeout = timeout;
	}

	send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void {
		if (this.readyState !== WsReadyStates.Open) {
			return;
		}

		let bytes: Uint8Array;
		if (data instanceof Uint8Array) {
			bytes = data;
		} else if (ArrayBuffer.isView(data)) {
			bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
		} else if (data instanceof ArrayBuffer) {
			bytes = new Uint8Array(data);
		} else {
			throw new TypeError("HttpFallback only sends binary messages");
		}

		// A client that stays alive but never acknowledges, or never reads, must
		// not grow the outbox forever.
		const oldest = this.outbox[0];
		if (oldest && Date.now() - oldest.at > this.unackedTimeout) {
			this.close(ConnectionTimeout.code, ConnectionTimeout.reason);
			return;
		}

		this.outbox.push({ seq: this.nextSeq, data: bytes, at: Date.now() });
		this.nextSeq += 1;

		if (!this.flushScheduled) {
			this.flushScheduled = true;
			queueMicrotask(() => {
				this.flushScheduled = false;
				this.flush();
			});
		}
	}

	/** Drop every message up to and including `cursor`. */
	ack(cursor: number): void {
		let count = 0;
		while (count < this.outbox.length && this.outbox[count].seq <= cursor) {
			count += 1;
		}
		if (count > 0) {
			this.outbox.splice(0, count);
		}
		this.acked = Math.max(this.acked, cursor);
	}

	/**
	 * Start a downstream response after `cursor`, replacing any previous one.
	 * Messages after `cursor` that were already written are written again.
	 */
	attach(
		mode: HttpTransportName,
		cursor: number,
		isOpen: boolean,
		headers: Headers,
	): Response {
		if (this.downstream) {
			this.endDownstream(this.downstream);
		}

		this.ack(cursor);
		this.written = cursor;

		const openPayload: HttpTransportOpenPayload = {
			key: this.key,
			heartbeatInterval: this.heartbeat,
			maxPayload: this.maxPayload,
		};
		this.pendingText =
			(mode === "sse" ? SSE_PADDING : "") +
			(isOpen
				? `event: ${HttpTransportEvent.Open}\ndata: ${JSON.stringify(openPayload)}\n\n`
				: "");

		let downstream: Downstream | undefined;
		const stream = new ReadableStream<Uint8Array>({
			start: (controller) => {
				downstream = { mode, controller };
				this.downstream = downstream;
			},
			pull: () => {
				if (this.downstream === downstream) {
					this.flush();
				}
			},
			cancel: () => {
				if (downstream) {
					this.detach(downstream);
				}
			},
		});

		this.flush();

		if (downstream && this.downstream === downstream) {
			const attached = downstream;
			if (mode === "sse") {
				attached.timeout = setTimeout(() => {
					this.pendingText += `:${HTTP_TRANSPORT_PROBE}\n\n`;
					this.flush();
				}, SSE_PROBE_DELAY);
				attached.interval = setInterval(() => {
					if (this.pendingText === "") {
						this.pendingText = ":\n\n";
					}
					this.flush();
				}, this.heartbeat);
				attached.interval.unref?.();
			} else {
				attached.timeout = setTimeout(
					() => this.endDownstream(attached),
					this.heartbeat,
				);
			}
			attached.timeout.unref?.();
		}

		headers.set(
			"Content-Type",
			mode === "sse" ? "text/event-stream" : "text/plain; charset=utf-8",
		);
		if (mode === "sse") {
			headers.set("X-Accel-Buffering", "no");
		}

		return new Response(stream, { status: 200, headers });
	}

	/**
	 * Write control text, unwritten messages and the close event to the
	 * attached downstream, as far as it has room. A client that stops reading
	 * leaves no room; its messages wait in the outbox.
	 */
	private flush(): void {
		const downstream = this.downstream;
		if (!downstream || (downstream.controller.desiredSize ?? 0) <= 0) {
			return;
		}

		let text = this.pendingText;
		// Sequence numbers in the outbox are contiguous, so the first unwritten
		// entry is found by arithmetic; written entries wait there for their ack.
		const first = this.outbox[0];
		const start = first ? Math.max(0, this.written - first.seq + 1) : 0;
		for (let index = start; index < this.outbox.length; index++) {
			const entry = this.outbox[index];
			text += `id: ${entry.seq}\ndata: ${encodeMessage(entry.data)}\n\n`;
			this.written = entry.seq;
		}
		if (this.closeEvent) {
			text += `event: ${HttpTransportEvent.Close}\ndata: ${JSON.stringify(this.closeEvent)}\n\n`;
		}
		if (text === "") {
			return;
		}

		this.pendingText = "";
		try {
			downstream.controller.enqueue(textEncoder.encode(text));
		} catch {
			this.detach(downstream);
			return;
		}

		if (downstream.mode === "polling" || this.closeEvent) {
			this.endDownstream(downstream);
		}
	}

	private detach(downstream: Downstream): void {
		clearTimeout(downstream.timeout);
		clearInterval(downstream.interval);
		if (this.downstream === downstream) {
			this.downstream = null;
		}
	}

	private endDownstream(downstream: Downstream): void {
		this.detach(downstream);
		try {
			downstream.controller.close();
		} catch {
			// The client already went away.
		}
	}

	/**
	 * Close the session from the server side (Hocuspocus, eviction, shutdown).
	 * The client receives the close event at the end of its stream, or as a
	 * 410 on its next request.
	 */
	close(code = 1000, reason = ""): void {
		if (this.readyState !== WsReadyStates.Open) {
			return;
		}

		const closeEvent = { code, reason };
		this.readyState = WsReadyStates.Closed;
		this.closeEvent = closeEvent;
		this.onClosed(this, closeEvent);

		this.flush();
		if (this.downstream) {
			this.endDownstream(this.downstream);
		}

		queueMicrotask(() => this.clientConnection?.handleClose(closeEvent));
	}

	/** The client closed the session. */
	closedByClient(): void {
		if (this.readyState !== WsReadyStates.Open) {
			return;
		}

		this.readyState = WsReadyStates.Closed;
		if (this.downstream) {
			this.endDownstream(this.downstream);
		}
		this.onClosed(this, null);

		queueMicrotask(() =>
			this.clientConnection?.handleClose({ code: 1005, reason: "" }),
		);
	}
}

/**
 * Serves the HTTP fallback transports of Hocuspocus: server-sent events and
 * long-polling. Both carry the regular Hocuspocus protocol, base64 encoded,
 * and hand every session to `Hocuspocus.handleConnection`, so hooks, token
 * authentication, multiplexing and close codes work as over WebSocket.
 *
 * `fetch` is a web-standard `Request → Response` handler and runs on every
 * runtime; route requests for which `matches` returns true to it, next to the
 * WebSocket upgrade. `handleNodeRequest` does the same for Node.js
 * (Express, Koa, `node:http`).
 *
 * - Sessions live in this instance's memory. With several instances, the
 *   load balancer has to route by the `hp_sid` query parameter (or a sticky
 *   cookie).
 * - `onUpgrade` hooks do not run for HTTP sessions; gates implemented there
 *   must be repeated in front of `fetch`. The built-in `Server` runs
 *   `onRequest` for the request that opens a session.
 * - Resuming a cut stream needs Hocuspocus' `timeout` to be longer than
 *   `heartbeatInterval` plus the provider's `connectTimeout`; otherwise a cut
 *   ends in a reconnect.
 */
export class HttpFallback<Context = any> {
	readonly configuration: HttpFallbackConfiguration;

	private readonly sessions = new Map<string, Session>();

	private readonly closedSessions = new Map<string, ClosedSession>();

	private destroyed = false;

	constructor(
		private readonly hocuspocus: Hocuspocus<Context>,
		configuration?: Partial<HttpFallbackConfiguration>,
	) {
		this.configuration = {
			...defaultHttpFallbackConfiguration,
			...configuration,
		};

		const { allowedOrigins, allowCredentials } = this.configuration;
		if (
			allowedOrigins !== "*" &&
			!(
				Array.isArray(allowedOrigins) &&
				allowedOrigins.length > 0 &&
				allowedOrigins.every(isOrigin)
			)
		) {
			throw new Error(
				'httpFallback.allowedOrigins must be "*" or a non-empty array of origins such as "https://app.example.com"',
			);
		}

		if (allowCredentials && allowedOrigins === "*") {
			throw new Error(
				"httpFallback.allowCredentials requires an explicit allowedOrigins list",
			);
		}

		for (const [key, minimum] of [
			["heartbeatInterval", 1000],
			["maxPayload", 1],
			["maxSessions", 1],
		] as const) {
			const value = this.configuration[key];
			if (!Number.isInteger(value) || value < minimum) {
				throw new Error(
					`httpFallback.${key} must be an integer of at least ${minimum}`,
				);
			}
		}
	}

	/**
	 * True when the request carries `hp_sid`. Accepts a web Request or a Node
	 * IncomingMessage. Never throws.
	 */
	matches(request: { url?: string }): boolean {
		const { url } = request;
		if (typeof url !== "string") {
			return false;
		}

		const queryStart = url.indexOf("?");
		if (queryStart === -1) {
			return false;
		}

		return new URLSearchParams(url.slice(queryStart + 1)).has(
			HttpTransportParameter.SessionId,
		);
	}

	/**
	 * Handle a transport request. Resolves with a response for every request,
	 * errors included.
	 */
	async fetch(request: Request, defaultContext?: Context): Promise<Response> {
		const headers = new Headers({
			"Cache-Control": "no-store, no-transform",
			"X-Content-Type-Options": "nosniff",
		});

		try {
			const { allowedOrigins, allowCredentials } = this.configuration;
			const origin = request.headers.get("origin");
			if (allowedOrigins === "*") {
				headers.set("Access-Control-Allow-Origin", "*");
			} else if (origin !== null) {
				if (!allowedOrigins.includes(origin)) {
					return textResponse(403, "Origin not allowed", headers);
				}
				headers.set("Access-Control-Allow-Origin", origin);
				headers.set("Vary", "Origin");
				if (allowCredentials) {
					headers.set("Access-Control-Allow-Credentials", "true");
				}
			} else {
				// Cross-site navigations and no-cors requests carry cookies but no
				// Origin header.
				const site = request.headers.get("sec-fetch-site");
				if (site !== null && site !== "same-origin" && site !== "none") {
					return textResponse(403, "Origin not allowed", headers);
				}
			}

			if (this.destroyed) {
				return textResponse(503, "Server is shutting down", headers);
			}

			if (request.method !== "GET" && request.method !== "POST") {
				headers.set("Allow", "GET, POST");
				return textResponse(405, "Method not allowed", headers);
			}

			const parameters = new URL(request.url).searchParams;
			const id = parameters.get(HttpTransportParameter.SessionId);
			if (id === null || !SESSION_ID.test(id)) {
				return textResponse(400, "Invalid session id", headers);
			}

			const transport = parameters.get(HttpTransportParameter.Transport);

			if (request.method === "GET") {
				if (
					!isTransport(transport) ||
					parameters.has(HttpTransportParameter.Cursor) ||
					parameters.has(HttpTransportParameter.Sequence) ||
					parameters.has(HttpTransportParameter.Close)
				) {
					return textResponse(400, "Invalid open request", headers);
				}

				if (this.sessions.has(id) || this.closedSessions.has(id)) {
					return textResponse(409, "Session exists", headers);
				}

				if (!this.makeRoom()) {
					return textResponse(503, "Too many sessions", headers);
				}

				return this.createSession(id, request, defaultContext).attach(
					transport,
					0,
					true,
					headers,
				);
			}

			const known = this.sessions.get(id) ?? this.closedSessions.get(id);
			if (!known) {
				return textResponse(404, "Session not found", headers);
			}

			const { key } = known;
			const body = await readBody(
				request,
				this.configuration.maxPayload,
				(line) => keysEqual(line, key),
			);
			if (body.status !== 200) {
				return body.status === 413
					? textResponse(413, "Payload too large", headers)
					: textResponse(404, "Session not found", headers);
			}

			// From here on everything runs synchronously, so a session that closed
			// while the body was read is seen as closed.
			const session = this.sessions.get(id);
			if (!session) {
				const closed = this.closedSessions.get(id);
				if (!closed || closed.key !== key) {
					return textResponse(404, "Session not found", headers);
				}
				return textResponse(
					410,
					JSON.stringify(closed.closeEvent),
					headers,
					"application/json",
				);
			}
			if (session.key !== key) {
				return textResponse(404, "Session not found", headers);
			}

			// Liveness and acknowledgements only count once the key matched.
			session.clientConnection.touch();

			const cursorParameter = parameters.get(HttpTransportParameter.Cursor);
			let cursor: number | null = null;
			if (cursorParameter !== null) {
				cursor = Number(cursorParameter);
				if (!INTEGER.test(cursorParameter) || cursor >= session.nextSeq) {
					return textResponse(400, "Invalid cursor", headers);
				}
				// A retried POST may carry an older cursor.
				if (transport === null && cursor >= session.acked) {
					session.ack(cursor);
				}
			}

			if (parameters.get(HttpTransportParameter.Close) === "1") {
				session.closedByClient();
				return new Response(null, { status: 204, headers });
			}

			const { lines } = body;

			if (transport !== null) {
				if (!isTransport(transport) || cursor === null || lines.length > 0) {
					return textResponse(400, "Invalid attach request", headers);
				}
				if (cursor < session.acked) {
					return textResponse(409, "Cursor already acknowledged", headers);
				}
				return session.attach(transport, cursor, false, headers);
			}

			if (lines.length === 0) {
				return new Response(null, { status: 204, headers });
			}

			const sequenceParameter = parameters.get(
				HttpTransportParameter.Sequence,
			);
			if (
				sequenceParameter === null ||
				!INTEGER.test(sequenceParameter) ||
				Number(sequenceParameter) === 0
			) {
				return textResponse(400, "Invalid sequence number", headers);
			}

			const sequence = Number(sequenceParameter);
			if (sequence <= session.received) {
				// Duplicate of a batch whose response was lost.
				return new Response(null, { status: 204, headers });
			}
			if (sequence !== session.received + 1) {
				return textResponse(400, "Sequence gap", headers);
			}

			if (
				lines.some(
					(line) => line === "" || line.length % 4 !== 0 || !BASE64.test(line),
				)
			) {
				return textResponse(400, "Invalid message", headers);
			}

			session.received = sequence;
			for (const line of lines) {
				// A malformed message makes Hocuspocus close the connection; the rest
				// of the batch must not keep hitting it.
				if (session.readyState !== WsReadyStates.Open) {
					break;
				}
				session.clientConnection.handleMessage(fromBase64(line));
			}

			return new Response(null, { status: 204, headers });
		} catch (error) {
			console.error(error);
			return textResponse(500, "Internal server error", headers);
		}
	}

	/**
	 * Handle a transport request of a Node.js HTTP server. Never rejects.
	 */
	async handleNodeRequest(
		request: IncomingMessage,
		response: ServerResponse,
		defaultContext?: Context,
	): Promise<void> {
		let webRequest: Request;
		try {
			webRequest = toWebRequest(request);
		} catch {
			response.writeHead(400, {
				"Content-Type": "text/plain; charset=utf-8",
				"Cache-Control": "no-store, no-transform",
				"X-Content-Type-Options": "nosniff",
			});
			response.end("Bad request");
			return;
		}

		try {
			await writeWebResponse(
				response,
				await this.fetch(webRequest, defaultContext),
			);
		} catch (error) {
			console.error(error);
			response.destroy();
		}
	}

	/**
	 * Close every session with 1001 and refuse further requests with 503.
	 */
	destroy(): void {
		this.destroyed = true;

		for (const session of [...this.sessions.values()]) {
			session.close(1001, "Going Away");
		}

		for (const closed of this.closedSessions.values()) {
			clearTimeout(closed.timer);
		}
		this.sessions.clear();
		this.closedSessions.clear();
	}

	/**
	 * Free a slot when every one is taken, by closing the oldest session that
	 * has not authenticated. Unauthenticated sessions cost one request and hold
	 * no connection; without this a trickle of opens would lock every fallback
	 * user out.
	 */
	private makeRoom(): boolean {
		for (const session of this.sessions.values()) {
			if (this.sessions.size < this.configuration.maxSessions) {
				break;
			}
			if (!session.clientConnection.authenticated) {
				session.close(ResetConnection.code, ResetConnection.reason);
			}
		}

		return this.sessions.size < this.configuration.maxSessions;
	}

	private createSession(
		id: string,
		request: Request,
		defaultContext?: Context,
	): Session {
		const session = new Session(
			id,
			this.configuration.maxPayload,
			this.configuration.heartbeatInterval,
			this.hocuspocus.configuration.timeout,
			(closedSession, closeEvent) =>
				this.retire(closedSession, closeEvent),
		);
		this.sessions.set(id, session);

		// Hooks see the open request without the transport parameters.
		const url = new URL(request.url);
		for (const name of [...url.searchParams.keys()]) {
			if (name.startsWith("hp_")) {
				url.searchParams.delete(name);
			}
		}

		session.clientConnection = this.hocuspocus.handleConnection(
			session,
			new Request(url, { headers: request.headers }),
			defaultContext ?? ({} as Context),
		);

		return session;
	}

	/**
	 * Remove a closed session. One the server closed keeps answering 410 with
	 * its close event for a while.
	 */
	private retire(session: Session, closeEvent: CloseEvent | null): void {
		this.sessions.delete(session.id);

		if (!closeEvent || this.destroyed) {
			return;
		}

		if (this.closedSessions.size >= this.configuration.maxSessions) {
			const [oldestId, oldest] = this.closedSessions.entries().next()
				.value as [string, ClosedSession];
			clearTimeout(oldest.timer);
			this.closedSessions.delete(oldestId);
		}

		const timer = setTimeout(
			() => this.closedSessions.delete(session.id),
			CLOSED_SESSION_TTL,
		);
		timer.unref?.();
		this.closedSessions.set(session.id, {
			key: session.key,
			closeEvent,
			timer,
		});
	}
}
