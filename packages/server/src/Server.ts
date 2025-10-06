import type {
	Server as HTTPServer,
	IncomingMessage,
	ServerResponse,
} from "node:http";
import { createServer } from "node:http";
import type { ListenOptions } from "node:net";
import kleur from "kleur";
import type WebSocket from "ws";
import { WebSocketServer } from "ws";
import type { AddressInfo, ServerOptions } from "ws";
import meta from "../package.json" assert { type: "json" };
import { Hocuspocus, defaultConfiguration } from "./Hocuspocus.ts";
import type { Configuration, onListenPayload } from "./types.ts";

export interface ServerConfiguration extends Configuration {
	port?: number;
	address?: string;
	stopOnSignals?: boolean;
}

export const defaultServerConfiguration = {
	port: 80,
	address: "0.0.0.0",
	stopOnSignals: true,
};

export class Server {
	httpServer: HTTPServer;

	webSocketServer: WebSocketServer;

	hocuspocus: Hocuspocus;

	configuration: ServerConfiguration = {
		...defaultConfiguration,
		...defaultServerConfiguration,
		extensions: [],
	};

	constructor(
		configuration?: Partial<ServerConfiguration>,
		websocketOptions: ServerOptions = {},
	) {
		if (configuration) {
			this.configuration = {
				...this.configuration,
				...configuration,
			};
		}

		this.hocuspocus = new Hocuspocus(this.configuration);
		this.hocuspocus.server = this;

		this.httpServer = createServer(this.requestHandler);
		this.webSocketServer = new WebSocketServer({
			noServer: true,
			...websocketOptions,
		});

		this.setupWebsocketConnection();
		this.setupHttpUpgrade();
	}

	setupWebsocketConnection = () => {
		this.webSocketServer.on(
			"connection",
			async (incoming: WebSocket, request: IncomingMessage) => {
				incoming.setMaxListeners(Number.POSITIVE_INFINITY);

				incoming.on("error", (error) => {
					/**
					 * Handle a ws instance error, which is required to prevent
					 * the server from crashing when one happens
					 * See https://github.com/websockets/ws/issues/1777#issuecomment-660803472
					 * @private
					 */
					console.error("Error emitted from webSocket instance:");
					console.error(error);
				});

				this.hocuspocus.handleConnection(incoming, request);
			},
		);
	};

	setupHttpUpgrade = () => {
		this.httpServer.on("upgrade", async (request, socket, head) => {
			try {
				await this.hocuspocus.hooks("onUpgrade", {
					request,
					socket,
					head,
					instance: this.hocuspocus,
				});

				// let the default websocket server handle the connection if
				// prior hooks don't interfere
				this.webSocketServer.handleUpgrade(request, socket, head, (ws) => {
					this.webSocketServer.emit("connection", ws, request);
				});
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

	async listen(port?: number, callback: any = null): Promise<Hocuspocus> {
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

	async destroy(): Promise<any> {
		await new Promise(async (resolve) => {
			this.httpServer.close();

			try {
				this.configuration.extensions.push({
					async afterUnloadDocument({ instance }) {
						if (instance.getDocumentsCount() === 0) resolve("");
					},
				});

				this.webSocketServer.close();
				if (this.hocuspocus.getDocumentsCount() === 0) resolve("");

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
