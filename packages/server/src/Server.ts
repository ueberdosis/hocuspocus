import type {
	Server as HTTPServer,
	IncomingMessage,
	ServerResponse,
} from "node:http";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import type { ListenOptions } from "node:net";
import crossws from "crossws/adapters/node";
import kleur from "kleur";
import meta from "../package.json" assert { type: "json" };
import { Hocuspocus, defaultConfiguration } from "./Hocuspocus.ts";
import {
	HttpFallback,
	type HttpFallbackConfiguration,
} from "./HttpFallback.ts";
import type { Configuration, WebSocketLike, onListenPayload } from "./types.ts";

export interface ServerConfiguration<Context = any>
	extends Configuration<Context> {
	port?: number;
	address?: string;
	stopOnSignals?: boolean;
	/**
	 * Options passed to the underlying WebSocket server (ws).
	 * Supports all ws ServerOptions, e.g. { maxPayload: 1024 * 1024 }.
	 * These apply before authentication, so lower `maxPayload`,
	 * `maxFragments` and `maxBufferedChunks` to limit how much memory a
	 * single unauthenticated connection can make the server buffer.
	 */
	websocketOptions?: Record<string, any>;
	/**
	 * Serve the HTTP fallback transports (server-sent events and long-polling)
	 * on the WebSocket URL, for clients whose network blocks WebSockets. Off by
	 * default; `true` uses the defaults of `HttpFallbackConfiguration`.
	 *
	 * - Sessions live in this instance's memory. With several instances, the
	 *   load balancer has to route by the `hp_sid` query parameter (or a sticky
	 *   cookie).
	 * - `onUpgrade` hooks do not run for HTTP sessions. `onRequest` runs for the
	 *   request that opens a session, not for the requests of an open session.
	 * - `timeout` also bounds how long a client may leave a delivered message
	 *   unacknowledged, or take nothing while messages wait for it, before its
	 *   session is closed with 4408; the time a slow client spends downloading
	 *   does not count. Resuming a cut stream needs it to be longer than
	 *   `heartbeatInterval` plus the provider's `connectTimeout`.
	 * - A POST, i.e. one batch of messages, has to arrive within the HTTP
	 *   server's request timeout (Node.js: `requestTimeout` of `http.Server`,
	 *   5 minutes by default).
	 */
	httpFallback?: boolean | Partial<HttpFallbackConfiguration>;
}

export const defaultServerConfiguration = {
	port: 80,
	stopOnSignals: true,
};

export class Server<Context = any> {
	httpServer: HTTPServer;

	private crossws: ReturnType<typeof crossws>;

	hocuspocus: Hocuspocus<Context>;

	httpFallback?: HttpFallback<Context>;

	configuration: ServerConfiguration<Context> = {
		...defaultConfiguration,
		...defaultServerConfiguration,
		extensions: [],
	};

	constructor(configuration?: Partial<ServerConfiguration<Context>>) {
		if (configuration) {
			this.configuration = {
				...this.configuration,
				...configuration,
			};
		}

		this.hocuspocus = new Hocuspocus(this.configuration);
		this.hocuspocus.server = this;

		if (this.configuration.httpFallback) {
			this.httpFallback = new HttpFallback(
				this.hocuspocus,
				this.configuration.httpFallback === true
					? {}
					: this.configuration.httpFallback,
			);
		}

		this.httpServer = createServer(this.requestHandler);
		this.crossws = crossws({
			serverOptions: this.configuration.websocketOptions,
			hooks: {
				open: (peer) => {
					const clientConnection = this.hocuspocus.handleConnection(
						peer.websocket as unknown as WebSocketLike,
						peer.request as Request,
					);
					(peer as any)._hocuspocus = clientConnection;

					// Count WebSocket pongs as connection activity: crossws filters
					// its own heartbeat pongs out of its pong hook, so listen on the
					// raw socket instead. Otherwise a healthy client that sends no
					// messages (e.g. awareness disabled) hits the idle timeout.
					(
						peer.websocket as unknown as {
							on?: (event: string, listener: () => void) => void;
						}
					).on?.("pong", () => {
						clientConnection.touch();
					});
				},
				message: (peer, message) => {
					(peer as any)._hocuspocus?.handleMessage(message.uint8Array());
				},
				close: (peer, event) => {
					(peer as any)._hocuspocus?.handleClose({
						code: event.code,
						reason: event.reason,
					});
				},
				error: (peer, error) => {
					console.error("WebSocket error for peer:", peer.id);
					console.error(error);
				},
			},
		});

		this.setupHttpUpgrade();
	}

	private setupHttpUpgrade = () => {
		this.httpServer.on("upgrade", async (request, socket, head) => {
			try {
				await this.hocuspocus.hooks("onUpgrade", {
					request,
					socket,
					head,
					instance: this.hocuspocus,
				});

				// Let crossws handle the WebSocket upgrade
				this.crossws.handleUpgrade(request, socket, head);
			} catch (error) {
				// if a hook rejects and the error is empty, do nothing
				// this is only meant to prevent later hooks and the
				// default handler to do something. if a error is present
				// just rethrow it
				if (error) {
					throw error;
				}
			}
		});
	};

	requestHandler = async (
		request: IncomingMessage,
		response: ServerResponse,
	) => {
		try {
			const fallback = this.httpFallback?.matches(request)
				? this.httpFallback
				: undefined;

			// The requests of an open session carry its key and skip the hook, as
			// WebSocket frames do; the request that opens one is a GET.
			if (!fallback || request.method === "GET") {
				await this.hocuspocus.hooks("onRequest", {
					request,
					response,
					instance: this.hocuspocus,
				});
			}

			if (fallback) {
				await fallback.handleNodeRequest(request, response);
				return;
			}

			// default response if all prior hooks don't interfere
			response.writeHead(200, { "Content-Type": "text/plain" });
			response.end("Welcome to Hocuspocus!");
		} catch (error) {
			// if a hook rejects and the error is empty, do nothing
			// this is only meant to prevent later hooks and the
			// default handler to do something. if a error is present
			// just rethrow it
			if (error) {
				throw error;
			}
		}
	};

	async listen(
		port?: number,
		callback: any = null,
	): Promise<Hocuspocus<Context>> {
		if (port) {
			this.configuration.port = port;
		}

		if (typeof callback === "function") {
			this.hocuspocus.configuration.extensions.push({
				onListen: callback,
			});
		}

		if (this.configuration.stopOnSignals) {
			const signalHandler = async () => {
				await this.destroy();
				process.exit(0);
			};

			process.on("SIGINT", signalHandler);
			process.on("SIGQUIT", signalHandler);
			process.on("SIGTERM", signalHandler);
		}
		// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
		return new Promise((resolve: Function, reject: Function) => {
			const listenOptions: ListenOptions = {
				port: this.configuration.port,
				host: this.configuration.address,
			};

			this.httpServer.listen(
				listenOptions,
				async () => {
					if (
						!this.configuration.quiet &&
						String(process.env.NODE_ENV) !== "testing"
					) {
						this.showStartScreen();
					}

					const onListenPayload = {
						instance: this.hocuspocus,
						configuration: this.configuration,
						port: this.address.port,
					} as onListenPayload;

					try {
						await this.hocuspocus.hooks("onListen", onListenPayload);
						resolve(this.hocuspocus);
					} catch (e) {
						reject(e);
					}
				},
			);
		});
	}

	get address(): AddressInfo {
		return (this.httpServer.address() || {
			port: this.configuration.port,
			address: this.configuration.address ?? "0.0.0.0",
			family: "IPv4",
		}) as AddressInfo;
	}

	private destroyPromise?: Promise<void>;

	async destroy(): Promise<void> {
		// Guard against multiple shutdowns (e.g. repeated SIGINT signals).
		// Subsequent callers await the same in-flight shutdown rather than
		// re-running close hooks on already-closed resources.
		this.destroyPromise ??= this.runDestroy();

		return this.destroyPromise;
	}

	private async runDestroy(): Promise<void> {
		await new Promise<void>((resolve) => {
			this.httpServer.close();

			try {
				this.configuration.extensions.push({
					async afterUnloadDocument({ instance }) {
						if (instance.getDocumentsCount() === 0) resolve();
					},
				});

				// Close all existing connections - this will trigger the close hook
				if (this.hocuspocus.getDocumentsCount() === 0) resolve();

				this.hocuspocus.closeConnections();

				// End every HTTP transport session with 1001 once the CLOSE
				// messages above are queued; later requests get 503.
				this.httpFallback?.destroy();

				// Flush any remaining debounced stores so documents unload
				// promptly, even when unloadImmediately is false.
				this.hocuspocus.flushPendingStores();
			} catch (error) {
				console.error(error);
			}
		});

		await this.hocuspocus.hooks("onDestroy", { instance: this.hocuspocus });
	}

	get URL(): string {
		return `${this.configuration.address ?? "0.0.0.0"}:${this.address.port}`;
	}

	get webSocketURL(): string {
		return `ws://${this.URL}`;
	}

	get httpURL(): string {
		return `http://${this.URL}`;
	}

	private showStartScreen() {
		const name = this.configuration.name ? ` (${this.configuration.name})` : "";

		console.log();
		console.log(
			`  ${kleur.cyan(`Hocuspocus v${meta.version}${name}`)}${kleur.green(" running at:")}`,
		);
		console.log();

		console.log(`  > HTTP: ${kleur.cyan(`${this.httpURL}`)}`);
		console.log(`  > WebSocket: ${this.webSocketURL}`);

		const extensions = this.configuration?.extensions
			.map((extension) => {
				return extension.extensionName ?? extension.constructor?.name;
			})
			.filter((name) => name)
			.filter((name) => name !== "Object");

		if (!extensions.length) {
			return;
		}

		console.log();
		console.log("  Extensions:");

		extensions.forEach((name) => {
			console.log(`  - ${name}`);
		});

		console.log();
		console.log(`  ${kleur.green("Ready.")}`);
		console.log();
	}
}
