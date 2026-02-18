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
import type { Configuration, WebSocketLike, onListenPayload } from "./types.ts";

export interface ServerConfiguration<Context = any>
	extends Configuration<Context> {
	port?: number;
	address?: string;
	stopOnSignals?: boolean;
	/**
	 * Options passed to the underlying WebSocket server (ws).
	 * Supports all ws ServerOptions, e.g. { maxPayload: 1024 * 1024 }
	 */
	websocketOptions?: Record<string, any>;
}

export const defaultServerConfiguration = {
	port: 80,
	address: "0.0.0.0",
	stopOnSignals: true,
};

export class Server<Context = any> {
	httpServer: HTTPServer;

	private crossws: ReturnType<typeof crossws>;

	hocuspocus: Hocuspocus<Context>;

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
			await this.hocuspocus.hooks("onRequest", {
				request,
				response,
				instance: this.hocuspocus,
			});

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
			this.httpServer.listen(
				{
					port: this.configuration.port,
					address: this.configuration.address,
				} as ListenOptions,
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
			address: this.configuration.address,
			family: "IPv4",
		}) as AddressInfo;
	}

	async destroy(): Promise<void> {
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
			} catch (error) {
				console.error(error);
			}
		});

		await this.hocuspocus.hooks("onDestroy", { instance: this.hocuspocus });
	}

	get URL(): string {
		return `${this.configuration.address}:${this.address.port}`;
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
