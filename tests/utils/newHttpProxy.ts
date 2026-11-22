import http from "node:http";
import type { AddressInfo } from "node:net";
import type { Hocuspocus } from "@hocuspocus/server";
import type { ExecutionContext } from "ava";

export interface HttpProxyOptions {
	/**
	 * What happens to event streams: forwarded (`pass`), never forwarded
	 * (`buffer`), or only status, headers and the first chunk (`stall`).
	 */
	eventStreams?: "pass" | "buffer" | "stall";
	/** Delay of POSTs without `hp_transport` (message batches, pings), in ms. */
	postDelay?: number;
}

export interface HttpProxy {
	webSocketURL: string;
	/** `METHOD url` of every HTTP request received. */
	requests: string[];
	/** Destroy in-flight requests that carry `hp_transport`, park new ones. */
	holdDownstreams(): void;
	/** Forward the parked requests. */
	releaseDownstreams(): void;
}

/**
 * A proxy in front of a Hocuspocus server that blocks WebSocket upgrades and
 * can buffer, stall or hold the HTTP transports' downstream responses.
 */
export const newHttpProxy = async (
	t: ExecutionContext,
	hocuspocus: Hocuspocus,
	options: HttpProxyOptions = {},
): Promise<HttpProxy> => {
	const { eventStreams = "pass", postDelay = 0 } = options;
	const targetPort = hocuspocus.server!.address.port;
	const requests: string[] = [];
	const downstreams = new Set<http.ServerResponse>();
	let parked: (() => void)[] = [];
	let holding = false;

	const forward = (
		request: http.IncomingMessage,
		response: http.ServerResponse,
	) => {
		if (request.destroyed || response.destroyed) {
			return;
		}

		const upstream = http.request(
			{
				host: "127.0.0.1",
				port: targetPort,
				method: request.method,
				path: request.url,
				headers: request.headers,
			},
			(upstreamResponse) => {
				const contentType = upstreamResponse.headers["content-type"] ?? "";
				if (
					eventStreams === "pass" ||
					!contentType.startsWith("text/event-stream")
				) {
					response.writeHead(
						upstreamResponse.statusCode ?? 502,
						upstreamResponse.headers,
					);
					upstreamResponse.pipe(response);
					return;
				}

				if (eventStreams === "buffer") {
					upstreamResponse.resume();
					return;
				}

				let first = true;
				upstreamResponse.on("data", (chunk) => {
					if (first) {
						first = false;
						response.writeHead(
							upstreamResponse.statusCode ?? 502,
							upstreamResponse.headers,
						);
						response.write(chunk);
					}
				});
			},
		);
		upstream.on("error", () => response.destroy());
		response.on("close", () => upstream.destroy());
		request.pipe(upstream);
	};

	// `closeAllConnections` exists since Node 18.2; the repo's @types/node predates it.
	const server = http.createServer((request, response) => {
		requests.push(`${request.method} ${request.url}`);

		const isDownstream = new URL(
			request.url ?? "/",
			"http://localhost",
		).searchParams.has("hp_transport");

		if (isDownstream) {
			downstreams.add(response);
			response.on("close", () => downstreams.delete(response));
			if (holding) {
				parked.push(() => forward(request, response));
				return;
			}
		} else if (request.method === "POST" && postDelay > 0) {
			setTimeout(() => forward(request, response), postDelay);
			return;
		}

		forward(request, response);
	}) as http.Server & { closeAllConnections(): void };

	server.on("upgrade", (_request, socket) => socket.destroy());

	await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));

	t.teardown(() => {
		server.closeAllConnections();
		server.close();
	});

	return {
		webSocketURL: `ws://127.0.0.1:${(server.address() as AddressInfo).port}`,
		requests,
		holdDownstreams() {
			holding = true;
			for (const response of downstreams) {
				response.destroy();
			}
		},
		releaseDownstreams() {
			holding = false;
			const released = parked;
			parked = [];
			for (const run of released) {
				run();
			}
		},
	};
};
