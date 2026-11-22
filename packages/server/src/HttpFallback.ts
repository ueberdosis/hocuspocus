import type { IncomingMessage, ServerResponse } from "node:http";
import {
	type CloseEvent,
	type HttpTransportName,
	HttpTransportParameter,
	ResetConnection,
} from "@hocuspocus/common";
import type { Hocuspocus } from "./Hocuspocus.ts";
import { HttpFallbackSession } from "./HttpFallbackSession.ts";
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
	/**
	 * Largest accepted POST body in bytes. It applies before authentication,
	 * like the `maxPayload` of `websocketOptions`. It also bounds how far a
	 * client may fall behind: once the messages queued behind the response on
	 * its way outgrow both this and the messages in that response, and the
	 * oldest of them has waited longer than Hocuspocus' `timeout`, the client
	 * reads slower than its documents change and is closed with 4408.
	 */
	maxPayload: number;
	/**
	 * Sessions held in memory, of all clients together. At the limit a new
	 * session replaces the oldest one that has not authenticated; if all have,
	 * it is refused with 503.
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

// How long a session the server closed still answers 410 with its close event.
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

const RESPONSE_HEADERS = {
	"Cache-Control": "no-store, no-transform",
	"X-Content-Type-Options": "nosniff",
};

/** What is left of a session the server closed. */
interface ClosedSession {
	key: string;
	closeEvent: CloseEvent;
	timer: ReturnType<typeof setTimeout>;
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

function isBase64(line: string): boolean {
	return line !== "" && line.length % 4 === 0 && BASE64.test(line);
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

function text(
	status: number,
	body: string,
	headers?: Record<string, string>,
): Response {
	return new Response(body, {
		status,
		headers: { "Content-Type": "text/plain; charset=utf-8", ...headers },
	});
}

function noContent(): Response {
	return new Response(null, { status: 204 });
}

// The answer to an unknown session and to a wrong key, indistinguishable on
// purpose.
function notFound(): Response {
	return text(404, "Session not found");
}

function withHeaders(
	response: Response,
	headers: Record<string, string>,
): Response {
	for (const [name, value] of Object.entries(headers)) {
		response.headers.set(name, value);
	}
	return response;
}

function validate(configuration: HttpFallbackConfiguration): void {
	const { allowedOrigins, allowCredentials } = configuration;
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
		const value = configuration[key];
		if (!Number.isInteger(value) || value < minimum) {
			throw new Error(
				`httpFallback.${key} must be an integer of at least ${minimum}`,
			);
		}
	}
}

/**
 * Read the body of a POST: the session key on the first line, then one
 * message per line. Returns the message lines, or the response for a body
 * that is refused. The key is checked as soon as its line is complete, so a
 * sender without it cannot make the server buffer `limit` bytes.
 */
async function readBody(
	request: Request,
	limit: number,
	isKey: (line: string) => boolean,
): Promise<string[] | Response> {
	const reader = request.body?.getReader();
	const decoder = new TextDecoder();
	let body = "";
	let size = 0;
	let keyAccepted = false;

	// Whether the first line is not the key. It is judged once it is complete
	// (`final`: the body has ended) or too long to be a key.
	const keyRefused = (final: boolean): boolean => {
		const end = body.indexOf("\n");
		const line = end === -1 ? body : body.slice(0, end);
		if (line.length > MAX_KEY_LENGTH) {
			return true;
		}
		if (end === -1 && !final) {
			return false;
		}
		keyAccepted = isKey(line);
		return !keyAccepted;
	};

	// The rest of a refused body is not read.
	const refuse = (response: Response): Response => {
		reader?.cancel().catch(() => {});
		return response;
	};

	try {
		while (reader) {
			const { done, value } = await reader.read();
			if (done) {
				break;
			}

			// The key is judged before the size, so that a sender without it
			// only ever gets the answer an unknown session gets.
			size += value.byteLength;
			body += decoder.decode(value, { stream: true });
			if (!keyAccepted && keyRefused(false)) {
				return refuse(notFound());
			}
			if (size > limit) {
				return refuse(text(413, "Payload too large"));
			}
		}
	} catch {
		// The client went away in the middle of its request.
		return text(400, "Incomplete request");
	}

	body += decoder.decode();
	if (!keyAccepted && keyRefused(true)) {
		return notFound();
	}

	return body.split("\n").slice(1);
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
 * - Hocuspocus' `timeout` also bounds how long a client may leave a delivered
 *   message unacknowledged, take nothing while messages wait for it, or keep
 *   a backlog larger than `maxPayload` and the messages on their way, before
 *   its session is closed with 4408; the time a slow client spends
 *   downloading does not count. Resuming a cut stream needs it to be longer
 *   than `heartbeatInterval` plus the provider's `connectTimeout`.
 * - A POST, i.e. one batch of messages, has to arrive within the HTTP
 *   server's request timeout (Node.js: `requestTimeout` of `http.Server`,
 *   5 minutes by default).
 */
export class HttpFallback<Context = any> {
	readonly configuration: HttpFallbackConfiguration;

	private readonly sessions = new Map<string, HttpFallbackSession>();

	// Not counted against `maxSessions`, but not more of them either.
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
		validate(this.configuration);
	}

	/**
	 * True when the request carries `hp_sid`. Accepts a web Request or a Node
	 * IncomingMessage. Never throws.
	 */
	matches(request: { url?: string }): boolean {
		// Not `new URL`: the URL of a Node.js request is a path, and one that
		// contains "://" would be taken for a full URL.
		const url = request.url ?? "";
		const queryStart = url.indexOf("?");

		return (
			queryStart !== -1 &&
			new URLSearchParams(url.slice(queryStart + 1)).has(
				HttpTransportParameter.SessionId,
			)
		);
	}

	/**
	 * Handle a transport request. Resolves with a response for every request,
	 * errors included.
	 */
	async fetch(request: Request, defaultContext?: Context): Promise<Response> {
		const cors = this.corsHeaders(request);
		const response = cors
			? await this.route(request, defaultContext).catch((error) => {
					console.error(error);
					return text(500, "Internal server error");
				})
			: text(403, "Origin not allowed");

		return withHeaders(response, { ...RESPONSE_HEADERS, ...cors });
	}

	/**
	 * Handle a transport request of a Node.js HTTP server. Never rejects.
	 */
	async handleNodeRequest(
		request: IncomingMessage,
		response: ServerResponse,
		defaultContext?: Context,
	): Promise<void> {
		try {
			let webRequest: Request | undefined;
			try {
				webRequest = toWebRequest(request);
			} catch {
				// A malformed Host header, or a method the fetch API refuses.
			}

			await writeWebResponse(
				response,
				webRequest
					? await this.fetch(webRequest, defaultContext)
					: withHeaders(text(400, "Bad request"), RESPONSE_HEADERS),
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

		for (const session of this.sessions.values()) {
			session.close(1001, "Going Away");
		}
		for (const closed of this.closedSessions.values()) {
			clearTimeout(closed.timer);
		}
		this.closedSessions.clear();
	}

	/**
	 * The CORS headers for a response to the request, or null when the request
	 * comes from an origin that is not allowed.
	 */
	private corsHeaders(request: Request): Record<string, string> | null {
		const { allowedOrigins, allowCredentials } = this.configuration;
		if (allowedOrigins === "*") {
			return { "Access-Control-Allow-Origin": "*" };
		}

		const origin = request.headers.get("origin");
		if (origin === null) {
			// Cross-site navigations and no-cors requests carry cookies but no
			// Origin header.
			const site = request.headers.get("sec-fetch-site");
			return site === null || site === "same-origin" || site === "none"
				? {}
				: null;
		}
		if (!allowedOrigins.includes(origin)) {
			return null;
		}

		return {
			"Access-Control-Allow-Origin": origin,
			Vary: "Origin",
			...(allowCredentials && { "Access-Control-Allow-Credentials": "true" }),
		};
	}

	private async route(
		request: Request,
		defaultContext?: Context,
	): Promise<Response> {
		if (this.destroyed) {
			return text(503, "Server is shutting down");
		}

		if (request.method !== "GET" && request.method !== "POST") {
			return text(405, "Method not allowed", { Allow: "GET, POST" });
		}

		const parameters = new URL(request.url).searchParams;
		const id = parameters.get(HttpTransportParameter.SessionId);
		if (id === null || !SESSION_ID.test(id)) {
			return text(400, "Invalid session id");
		}

		return request.method === "GET"
			? this.open(id, parameters, request, defaultContext)
			: this.post(id, parameters, request);
	}

	/** A GET opens a session and is its first downstream response. */
	private open(
		id: string,
		parameters: URLSearchParams,
		request: Request,
		defaultContext?: Context,
	): Response {
		const transport = parameters.get(HttpTransportParameter.Transport);
		if (
			!isTransport(transport) ||
			parameters.has(HttpTransportParameter.Cursor) ||
			parameters.has(HttpTransportParameter.Sequence) ||
			parameters.has(HttpTransportParameter.Close)
		) {
			return text(400, "Invalid open request");
		}

		if (this.find(id)) {
			return text(409, "Session exists");
		}

		if (!this.makeRoom()) {
			return text(503, "Too many sessions");
		}

		return this.createSession(id, request, defaultContext).open(transport);
	}

	/**
	 * A POST is a request of an open session, proven by the key in its body: a
	 * batch of messages, a ping, a new downstream response, or the close.
	 */
	private async post(
		id: string,
		parameters: URLSearchParams,
		request: Request,
	): Promise<Response> {
		const known = this.find(id);
		if (!known) {
			return notFound();
		}

		const { key } = known;
		const lines = await readBody(
			request,
			this.configuration.maxPayload,
			(line) => keysEqual(line, key),
		);
		if (lines instanceof Response) {
			return lines;
		}

		// From here on everything runs synchronously. While the body was read,
		// the session may have closed, and its id may even have been used again.
		const session = this.find(id);
		if (session?.key !== key) {
			return notFound();
		}
		if (!(session instanceof HttpFallbackSession)) {
			return new Response(JSON.stringify(session.closeEvent), {
				status: 410,
				headers: { "Content-Type": "application/json" },
			});
		}

		// Liveness and acknowledgements only count once the key matched.
		session.clientConnection.touch();

		const cursorParameter = parameters.get(HttpTransportParameter.Cursor);
		let cursor: number | null = null;
		if (cursorParameter !== null) {
			cursor = Number(cursorParameter);
			if (!INTEGER.test(cursorParameter) || !session.acknowledge(cursor)) {
				return text(400, "Invalid cursor");
			}
		}

		if (parameters.get(HttpTransportParameter.Close) === "1") {
			session.closedByClient();
			return noContent();
		}

		const transport = parameters.get(HttpTransportParameter.Transport);
		if (transport !== null) {
			if (!isTransport(transport) || cursor === null || lines.length > 0) {
				return text(400, "Invalid attach request");
			}
			return (
				session.attach(transport, cursor) ??
				text(409, "Cursor already acknowledged")
			);
		}

		// A ping: the key and the cursor were all it had to say.
		if (lines.length === 0) {
			return noContent();
		}

		const sequence = parameters.get(HttpTransportParameter.Sequence);
		if (
			sequence === null ||
			!INTEGER.test(sequence) ||
			Number(sequence) === 0
		) {
			return text(400, "Invalid sequence number");
		}
		if (!lines.every(isBase64)) {
			return text(400, "Invalid message");
		}
		if (!session.receive(Number(sequence), lines)) {
			return text(400, "Sequence gap");
		}

		return noContent();
	}

	private find(id: string): HttpFallbackSession | ClosedSession | undefined {
		return this.sessions.get(id) ?? this.closedSessions.get(id);
	}

	/**
	 * Free a slot when every one is taken, by closing the oldest session that
	 * has not authenticated. Unauthenticated sessions cost one request and hold
	 * no connection; without this a trickle of opens would lock every fallback
	 * user out.
	 */
	private makeRoom(): boolean {
		if (this.sessions.size < this.configuration.maxSessions) {
			return true;
		}

		for (const session of this.sessions.values()) {
			if (!session.clientConnection.authenticated) {
				session.close(ResetConnection.code, ResetConnection.reason);
				return true;
			}
		}

		return false;
	}

	private createSession(
		id: string,
		request: Request,
		defaultContext?: Context,
	): HttpFallbackSession {
		// Hooks see the request that opened the session, without the transport
		// parameters.
		const url = new URL(request.url);
		for (const name of [...url.searchParams.keys()]) {
			if (name.startsWith("hp_")) {
				url.searchParams.delete(name);
			}
		}
		const hookRequest = new Request(url, { headers: request.headers });

		const key = crypto.randomUUID();
		const { timeout } = this.hocuspocus.configuration;
		const session = new HttpFallbackSession({
			key,
			// Clients send a request on every heartbeat, so a heartbeat of at most
			// half the idle timeout keeps a healthy session alive.
			heartbeat: Math.min(
				this.configuration.heartbeatInterval,
				Math.max(1, Math.floor(timeout / 2)),
			),
			maxPayload: this.configuration.maxPayload,
			timeout,
			connect: (socket) =>
				this.hocuspocus.handleConnection(socket, hookRequest, defaultContext),
			onClose: (closeEvent) => this.retire(id, key, closeEvent),
		});
		this.sessions.set(id, session);

		return session;
	}

	/**
	 * Forget a session that closed. One the server closed keeps answering 410
	 * with its close event for a while.
	 */
	private retire(id: string, key: string, closeEvent: CloseEvent | null): void {
		this.sessions.delete(id);

		if (!closeEvent || this.destroyed) {
			return;
		}

		// At the limit the oldest entry makes room; its client gets 404 instead.
		if (this.closedSessions.size >= this.configuration.maxSessions) {
			for (const [oldestId, oldest] of this.closedSessions) {
				clearTimeout(oldest.timer);
				this.closedSessions.delete(oldestId);
				break;
			}
		}

		const timer = setTimeout(
			() => this.closedSessions.delete(id),
			CLOSED_SESSION_TTL,
		);
		timer.unref?.();
		this.closedSessions.set(id, { key, closeEvent, timer });
	}
}
