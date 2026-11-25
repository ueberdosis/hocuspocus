import type { IncomingMessage, ServerResponse } from "node:http";
import { Readable } from "node:stream";

// A response body is written in slices of at most this size, and the client
// has WRITE_TIMEOUT to take each of them. `drain` only reports whole writes: a
// large message written in one piece could not be told from a client that
// stopped reading.
const WRITE_SLICE = 64 * 1024;
const WRITE_TIMEOUT = 30_000;

// How long an ended response may take to flush before its socket is destroyed.
const END_DESTROY_DELAY = 5_000;

// `Readable.toWeb` exists since Node 17. The type check at the repository
// root resolves `node:stream` from @types/node 16, which does not declare it.
const ReadableWithToWeb = Readable as unknown as {
	toWeb(readable: Readable): ReadableStream<Uint8Array>;
};

/**
 * Convert a Node.js request into a web `Request`. The body is streamed, not
 * buffered. Throws on a malformed `Host` header and on a method the fetch API
 * refuses.
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
 * body stream is cancelled once the client goes away. Resolves once the end
 * of the response was handed to the OS, or the response was destroyed; a
 * response that is not done END_DESTROY_DELAY after its end is given up.
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

	// A flat list of names and values keeps headers that occur more than once.
	const headers: string[] = [];
	webResponse.headers.forEach((value, name) => {
		headers.push(name, value);
	});
	response.writeHead(webResponse.status, headers);

	const reader = webResponse.body?.getReader();
	let closed = false;
	response.once("close", () => {
		closed = true;
		reader?.cancel().catch(() => {});
	});

	while (reader && !closed) {
		const { done, value } = await reader.read();
		if (done) {
			break;
		}

		for (
			let offset = 0;
			offset < value.byteLength && !closed;
			offset += WRITE_SLICE
		) {
			const taken =
				response.write(value.subarray(offset, offset + WRITE_SLICE)) ||
				(await waitForDrain(response));
			if (!taken) {
				// The client stopped reading; `close` cancels the body.
				response.destroy();
				return;
			}
		}
	}

	if (closed) {
		return;
	}

	// Not done before the end was handed to the OS (`close` follows `finish`):
	// a process that exits right after this, at shutdown, would drop what is
	// still queued, such as the close event of an HTTP session. Done once the
	// response is given up, though: Node 22 emits no `close` for a response
	// queued behind another on a connection that went away, and destroys no
	// response without a socket.
	await new Promise<void>((resolve) => {
		const timer = setTimeout(() => {
			response.destroy();
			resolve();
		}, END_DESTROY_DELAY);
		timer.unref();
		response.once("close", () => {
			clearTimeout(timer);
			resolve();
		});
		response.end();
	});
}

/**
 * Resolves with true once the response drained or closed, with false when it
 * did neither within WRITE_TIMEOUT.
 */
function waitForDrain(response: ServerResponse): Promise<boolean> {
	return new Promise((resolve) => {
		const settle = (drained: boolean) => {
			clearTimeout(timer);
			response.off("drain", onDrain);
			response.off("close", onDrain);
			resolve(drained);
		};
		const onDrain = () => settle(true);
		const timer = setTimeout(() => settle(false), WRITE_TIMEOUT);
		timer.unref();

		response.once("drain", onDrain);
		response.once("close", onDrain);
	});
}
