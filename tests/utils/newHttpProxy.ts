import http from "node:http";
import type { AddressInfo } from "node:net";
import type { Hocuspocus } from "@hocuspocus/server";
import type { ExecutionContext } from "ava";

export interface HttpProxyOptions {
	/**
	 * What happens to event streams: forwarded as they come (`pass`), never
	 * forwarded (`buffer`), forwarded up to the probe and no further (`stall`),
	 * forwarded a few bytes at a time (`trickle`), or a byte at a time, too
	 * slowly for a transport to open (`drip`).
	 */
	eventStreams?: "pass" | "buffer" | "stall" | "trickle" | "drip";
}

export interface HttpProxy {
	webSocketURL: string;
	/** `METHOD url` of every HTTP request received. */
	requests: string[];
	/** Break the connections of the downstream requests in flight. */
	cutDownstreams(): void;
	/** `cutDownstreams`, and park the downstream requests that follow. */
	holdDownstreams(): void;
	/** Forward the parked requests. */
	releaseDownstreams(): void;
	/**
	 * Lose the response to the next downstream request, or to the next POST of
	 * another kind: the server answers, the client sees a broken connection.
	 */
	loseNextResponse(kind: "downstream" | "post"): void;
	/**
	 * Hold every POST that carries messages for `delay` ms before it is
	 * forwarded, as if it took that long to upload.
	 */
	delayBatches(delay: number): void;
	/**
	 * Answer every request from now on like a Hocuspocus server that does not
	 * serve the HTTP transports.
	 */
	stopServingTransports(): void;
}

/**
 * A proxy in front of a Hocuspocus server that blocks WebSocket upgrades and
 * can disturb the requests of the HTTP transports. Requests that carry
 * `hp_transport` are downstream requests.
 */
export const newHttpProxy = async (
	t: ExecutionContext,
	hocuspocus: Hocuspocus,
	options: HttpProxyOptions = {},
): Promise<HttpProxy> => {
	const { eventStreams = "pass" } = options;
	const target = new URL(hocuspocus.server!.httpURL);
	const requests: string[] = [];
	const downstreams = new Set<http.ServerResponse>();
	let parked: (() => void)[] = [];
	let holding = false;
	let losing: "downstream" | "post" | null = null;
	let batchDelay = 0;
	let servingTransports = true;

	const forward = (
		request: http.IncomingMessage,
		response: http.ServerResponse,
		lose: boolean,
	) => {
		if (request.destroyed || response.destroyed) {
			return;
		}

		const upstream = http.request(
			{
				host: target.hostname,
				port: target.port,
				method: request.method,
				path: request.url,
				headers: request.headers,
			},
			(upstreamResponse) => {
				if (lose) {
					upstreamResponse.resume();
					response.destroy();
					return;
				}

				const contentType = upstreamResponse.headers["content-type"] ?? "";
				if (
					eventStreams === "buffer" &&
					contentType.startsWith("text/event-stream")
				) {
					upstreamResponse.resume();
					return;
				}

				response.writeHead(
					upstreamResponse.statusCode ?? 502,
					upstreamResponse.headers,
				);
				if (
					eventStreams === "pass" ||
					!contentType.startsWith("text/event-stream")
				) {
					upstreamResponse.pipe(response);
					return;
				}

				if (eventStreams === "stall") {
					let stalled = false;
					upstreamResponse.on("data", (chunk: Buffer) => {
						if (stalled) {
							return;
						}
						const text = chunk.toString();
						const probe = text.indexOf(":probe");
						stalled = probe !== -1;
						response.write(stalled ? text.slice(0, probe) : text);
					});
					return;
				}

				// `trickle`: three bytes at a time, each in a chunk of its own, so
				// that lines and events are split in every possible place. `drip`:
				// a byte every 20 ms, so that the stream keeps arriving and gets
				// nowhere.
				const step = eventStreams === "drip" ? 1 : 3;
				const pause = () =>
					new Promise<void>((resolve) => {
						if (eventStreams === "drip") {
							setTimeout(resolve, 20).unref();
						} else {
							setImmediate(resolve);
						}
					});
				let written = Promise.resolve();
				upstreamResponse.on("data", (chunk: Buffer) => {
					written = written.then(async () => {
						for (
							let offset = 0;
							offset < chunk.length && !response.destroyed;
							offset += step
						) {
							response.write(chunk.subarray(offset, offset + step));
							await pause();
						}
					});
				});
			},
		);
		upstream.on("error", () => response.destroy());
		response.on("close", () => upstream.destroy());
		request.pipe(upstream);
	};

	// `closeAllConnections` exists since Node 18.2. The type check at the
	// repository root resolves `node:http` from @types/node 16, which does not
	// declare it.
	const server = http.createServer((request, response) => {
		requests.push(`${request.method} ${request.url}`);

		if (!servingTransports) {
			request.resume();
			response.writeHead(200, { "Content-Type": "text/plain" });
			response.end("Welcome to Hocuspocus!");
			return;
		}

		const parameters = new URL(request.url ?? "/", "http://localhost")
			.searchParams;
		const isDownstream = parameters.has("hp_transport");
		const kind = isDownstream
			? "downstream"
			: request.method === "POST"
				? "post"
				: null;
		const lose = kind !== null && kind === losing;
		if (lose) {
			losing = null;
		}

		if (isDownstream) {
			downstreams.add(response);
			response.on("close", () => downstreams.delete(response));
			if (holding) {
				parked.push(() => forward(request, response, lose));
				return;
			}
		} else if (batchDelay > 0 && parameters.has("hp_seq")) {
			setTimeout(() => forward(request, response, lose), batchDelay);
			return;
		}

		forward(request, response, lose);
	}) as http.Server & { closeAllConnections(): void };

	server.on("upgrade", (_request, socket) => socket.destroy());

	await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));

	t.teardown(() => {
		server.closeAllConnections();
		server.close();
	});

	const cutDownstreams = () => {
		for (const response of downstreams) {
			response.destroy();
		}
	};

	return {
		webSocketURL: `ws://127.0.0.1:${(server.address() as AddressInfo).port}`,
		requests,
		cutDownstreams,
		holdDownstreams() {
			holding = true;
			cutDownstreams();
		},
		releaseDownstreams() {
			holding = false;
			const released = parked;
			parked = [];
			for (const run of released) {
				run();
			}
		},
		delayBatches(delay) {
			batchDelay = delay;
		},
		loseNextResponse(kind) {
			losing = kind;
		},
		stopServingTransports() {
			servingTransports = false;
			cutDownstreams();
		},
	};
};
