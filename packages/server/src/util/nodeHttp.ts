import type { IncomingMessage, ServerResponse } from "node:http";
import { Readable } from "node:stream";

// While waiting for `drain`, how often the response's write buffer is sampled.
// A buffer that did not shrink between two samples belongs to a client that
// stopped reading.
const DRAIN_STALL_TIMEOUT = 10_000;

// How long an ended response may take to flush before its socket is destroyed.
const END_DESTROY_DELAY = 5_000;

// `Readable.toWeb` exists since Node 17; the repo's @types/node predates it.
const ReadableWithToWeb = Readable as unknown as {
	toWeb(readable: Readable): ReadableStream<Uint8Array>;
};

/**
 * Convert a Node.js request into a web `Request`. The body is streamed, not
 * buffered. Throws on a malformed `Host` header.
 */
export function toWebRequest(request: IncomingMessage): Request {
	const { socket } = request;
	const encrypted = "encrypted" in socket && socket.encrypted === true;
	const protocol =
		encrypted || request.headers["x-forwarded-proto"] === "https"
			? "https"
			: "http";
	const url = `${protocol}://${request.headers.host ?? "localhost"}${request.url ?? "/"}`;

	const headers = new Headers();
	for (const [name, value] of Object.entries(request.headers)) {
		if (Array.isArray(value)) {
			for (const entry of value) {
				headers.append(name, entry);
			}
		} else if (value !== undefined) {
			headers.append(name, value);
		}
	}

	const method = request.method ?? "GET";
	const init: RequestInit & { duplex?: "half" } = { method, headers };
	if (method !== "GET" && method !== "HEAD") {
		init.body = ReadableWithToWeb.toWeb(request);
		init.duplex = "half";
	}

	return new Request(url, init);
}

/**
 * Write a web `Response` to a Node.js response, honouring backpressure in both
 * directions: the body is read only as fast as the client accepts it, and the
 * body stream is cancelled once the client goes away.
 */
export async function writeWebResponse(
	response: ServerResponse,
	webResponse: Response,
): Promise<void> {
	// The client went away while the response was being prepared (for example
	// while a POST body was read). `close` has already fired and will not fire
	// again, so release the body now; an event stream would otherwise stay
	// attached to a dead socket.
	if (response.destroyed) {
		await webResponse.body?.cancel().catch(() => {});
		return;
	}

	const headers: Record<string, string> = {};
	webResponse.headers.forEach((value, name) => {
		headers[name] = value;
	});
	response.writeHead(webResponse.status, headers);

	if (!webResponse.body) {
		response.end();
		return;
	}

	const reader = webResponse.body.getReader();
	let closed = false;
	response.once("close", () => {
		closed = true;
		reader.cancel().catch(() => {});
	});

	while (!closed) {
		const { done, value } = await reader.read();
		if (done || closed) {
			break;
		}

		if (!response.write(value) && !(await waitForDrain(response))) {
			reader.cancel().catch(() => {});
			response.destroy();
			return;
		}
	}

	if (closed) {
		return;
	}

	response.end();
	const timer = setTimeout(() => response.destroy(), END_DESTROY_DELAY);
	timer.unref?.();
	response.once("close", () => clearTimeout(timer));
}

/**
 * Resolve once the response drained or closed (true), or with false once its
 * write buffer stopped shrinking.
 */
function waitForDrain(response: ServerResponse): Promise<boolean> {
	const { promise, resolve } = Promise.withResolvers<boolean>();
	let previousLength = response.writableLength;

	const finish = (drained: boolean) => {
		clearInterval(interval);
		response.off("drain", onDrain);
		response.off("close", onDrain);
		resolve(drained);
	};
	const onDrain = () => finish(true);
	const interval = setInterval(() => {
		const length = response.writableLength;
		if (length >= previousLength) {
			finish(false);
			return;
		}
		previousLength = length;
	}, DRAIN_STALL_TIMEOUT);
	interval.unref?.();

	response.once("drain", onDrain);
	response.once("close", onDrain);

	return promise;
}
