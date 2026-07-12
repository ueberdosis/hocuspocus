import { spawn } from "node:child_process";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ExecutionContext } from "ava";
import type { Hocuspocus, ServerConfiguration } from "@hocuspocus/server";

/**
 * Rust-target counterpart of newHocuspocus(): spawns the Rust server
 * binary (HOCUSPOCUS_RUST_BIN or target/debug/hocuspocus-server) and
 * returns a shim exposing the narrow slice of the Hocuspocus surface the
 * provider tests use.
 *
 * Server-side hook closures and extensions cannot run inside the Rust
 * binary; once the webhook hook transport lands (M3), they are served by a
 * per-test HTTP receiver instead. Until then, tests passing such options
 * fail fast with a descriptive error and live in the skip-map
 * (tests/conformance/rust-target.json).
 */
export const newHocuspocusRust = async (
	t: ExecutionContext,
	options?: Partial<ServerConfiguration>,
): Promise<Hocuspocus> => {
	const supportedHooks = ["onAuthenticate", "onLoadDocument", "onStoreDocument", "onConnect", "onDisconnect", "onStateless"];
	// Redis extension instances map onto the binary's [redis] config; any
	// other extension is unsupported.
	const extensions = (options?.extensions ?? []) as Array<{
		constructor: { name: string };
		configuration?: { host?: string; port?: number; identifier?: string; prefix?: string };
	}>;
	const redisExtension = extensions.find((ext) => ext?.constructor?.name === "Redis");
	const unsupported = Object.entries(options ?? {}).filter(([key, value]) => {
		if (key === "extensions") {
			return extensions.some((ext) => ext?.constructor?.name !== "Redis");
		}
		return typeof value === "function" && !supportedHooks.includes(key);
	});
	if (unsupported.length > 0) {
		throw new Error(
			`HOCUSPOCUS_TEST_TARGET=rust does not support in-process hooks/extensions yet ` +
				`(${unsupported.map(([key]) => key).join(", ")}); waiting on the M3 webhook transport`,
		);
	}

	const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
	const binary =
		process.env.HOCUSPOCUS_RUST_BIN ??
		path.join(repoRoot, "target/debug/hocuspocus-server");

	// onAuthenticate closures are served over the production webhook
	// contract: a per-test HTTP receiver dispatches the Rust server's auth
	// events to the closure the test provided.
	const env: Record<string, string | undefined> = {
		...process.env,
		HOCUSPOCUS_SERVER__LISTEN: "127.0.0.1:0",
		HOCUSPOCUS_SERVER__QUIET: "true",
	};
	if (redisExtension?.configuration) {
		const { host = "127.0.0.1", port = 6379, identifier, prefix } = redisExtension.configuration;
		env.HOCUSPOCUS_REDIS__URL = `redis://${host}:${port}`;
		if (identifier) env.HOCUSPOCUS_REDIS__IDENTIFIER = identifier;
		if (prefix) env.HOCUSPOCUS_REDIS__PREFIX = prefix;
	}

	// Scalar server options map onto the binary's config env.
	if (typeof options?.debounce === "number") env.HOCUSPOCUS_SERVER__DEBOUNCE_MS = String(options.debounce);
	if (typeof options?.maxDebounce === "number") env.HOCUSPOCUS_SERVER__MAX_DEBOUNCE_MS = String(options.maxDebounce);
	if (typeof options?.timeout === "number") env.HOCUSPOCUS_SERVER__TIMEOUT_MS = String(options.timeout);
	if (typeof options?.unloadImmediately === "boolean")
		env.HOCUSPOCUS_SERVER__UNLOAD_IMMEDIATELY = String(options.unloadImmediately);
	if (typeof options?.maxUnauthenticatedQueueSize === "number")
		env.HOCUSPOCUS_SERVER__MAX_UNAUTHENTICATED_QUEUE_SIZE = String(options.maxUnauthenticatedQueueSize);
	if (typeof options?.maxUnauthenticatedQueueMessages === "number")
		env.HOCUSPOCUS_SERVER__MAX_UNAUTHENTICATED_QUEUE_MESSAGES = String(options.maxUnauthenticatedQueueMessages);
	if (typeof options?.maxPendingDocuments === "number")
		env.HOCUSPOCUS_SERVER__MAX_PENDING_DOCUMENTS = String(options.maxPendingDocuments);

	if (
		options?.onAuthenticate ||
		options?.onLoadDocument ||
		options?.onStoreDocument ||
		options?.onConnect ||
		options?.onDisconnect ||
		options?.onStateless
	) {
		const Y = await import("yjs");
		const receiver = http.createServer((request, response) => {
			const chunks: Buffer[] = [];
			request.on("data", (chunk) => chunks.push(chunk));
			request.on("end", async () => {
				const body = Buffer.concat(chunks);
				try {
					const documentMatch = request.url?.match(/^\/documents\/(.+)$/);
					if (documentMatch && request.method === "GET") {
						// Binary persistence fetch → onLoadDocument closure.
						const documentName = decodeURIComponent(documentMatch[1]);
						if (!options.onLoadDocument) {
							response.writeHead(404).end();
							return;
						}
						const document = new Y.Doc();
						const returned = await options.onLoadDocument({
							document,
							documentName,
							context: {},
							instance: undefined,
						} as never);
						const state = Y.encodeStateAsUpdate((returned as InstanceType<typeof Y.Doc>) ?? document);
						response.writeHead(200, { "Content-Type": "application/octet-stream" });
						response.end(Buffer.from(state));
						return;
					}
					if (documentMatch && request.method === "PUT") {
						// Binary persistence store → onStoreDocument closure.
						const documentName = decodeURIComponent(documentMatch[1]);
						if (options.onStoreDocument) {
							const document = new Y.Doc();
							Y.applyUpdate(document, new Uint8Array(body));
							await options.onStoreDocument({
								document,
								documentName,
								state: body,
								context: {},
								instance: undefined,
							} as never);
						}
						response.writeHead(200).end();
						return;
					}
					// JSON event endpoint (auth / connect / disconnect).
					const { event, payload } = JSON.parse(body.toString());
					const connectionConfig = { readOnly: false, isAuthenticated: false };
					if (event === "connect") {
						await options.onConnect?.({
							documentName: payload.documentName,
							context: {},
							connectionConfig,
							connection: connectionConfig,
							requestHeaders: {},
							requestParameters: new URLSearchParams(),
						} as never);
						response.writeHead(200, { "Content-Type": "application/json" });
						response.end(JSON.stringify({}));
						return;
					}
					if (event === "stateless") {
						// connection.sendStateless replies to the sender via the
						// webhook response's `respond` field.
						let respond: string | undefined;
						await options.onStateless?.({
							documentName: payload.documentName,
							payload: payload.payload,
							context: {},
							connection: {
								sendStateless(reply: string) {
									respond = reply;
								},
							},
						} as never);
						response.writeHead(200, { "Content-Type": "application/json" });
						response.end(JSON.stringify(respond === undefined ? {} : { respond }));
						return;
					}
					if (event === "disconnect") {
						await options.onDisconnect?.({
							documentName: payload.documentName,
							context: {},
						} as never);
						response.writeHead(200, { "Content-Type": "application/json" });
						response.end(JSON.stringify({}));
						return;
					}
					if (!options.onAuthenticate) {
						response.writeHead(200, { "Content-Type": "application/json" });
						response.end(JSON.stringify({ context: {}, scope: "read-write" }));
						return;
					}
					const context = await options.onAuthenticate({
						token: payload.token,
						documentName: payload.documentName,
						providerVersion: payload.providerVersion,
						connectionConfig,
						connection: connectionConfig,
						context: {},
						requestHeaders: {},
						requestParameters: new URLSearchParams(),
					} as never);
					response.writeHead(200, { "Content-Type": "application/json" });
					response.end(
						JSON.stringify({
							context: context ?? {},
							scope: connectionConfig.readOnly ? "readonly" : "read-write",
						}),
					);
				} catch (error) {
					response.writeHead(403, { "Content-Type": "application/json" });
					response.end(JSON.stringify({ reason: (error as Error).message || "permission-denied" }));
				}
			});
		});
		await new Promise<void>((resolve) => receiver.listen(0, "127.0.0.1", resolve));
		const receiverPort = (receiver.address() as { port: number }).port;
		t.teardown(() => receiver.close());
		env.HOCUSPOCUS_WEBHOOK__URL = `http://127.0.0.1:${receiverPort}`;
		env.HOCUSPOCUS_WEBHOOK__SECRET = "test-secret";
		if (options.onAuthenticate) env.HOCUSPOCUS_AUTH__MODE = "webhook";
		const events = [
			options.onConnect ? "connect" : null,
			options.onDisconnect ? "disconnect" : null,
			options.onStateless ? "stateless" : null,
		].filter(Boolean);
		if (events.length > 0) env.HOCUSPOCUS_WEBHOOK__EVENTS = events.join(",");
		if (options.onLoadDocument || options.onStoreDocument) env.HOCUSPOCUS_STORAGE__BACKEND = "webhook";
	}

	const child = spawn(binary, [], {
		env,
		stdio: ["ignore", "pipe", "inherit"],
	});

	const readyLine: string = await new Promise((resolve, reject) => {
		child.stdout.once("data", (data) => resolve(String(data).split("\n")[0]));
		child.once("error", reject);
		child.once("exit", (code) => reject(new Error(`rust server exited early: ${code}`)));
	});
	const ready = JSON.parse(readyLine);
	const baseURL = `127.0.0.1:${ready.port}`;

	t.teardown(() => {
		child.kill("SIGKILL");
	});

	const controlStats = async () => {
		const response = await fetch(`http://${baseURL}/control/stats`);
		return (await response.json()) as { connections: number; documents: number };
	};

	// Sync getConnectionsCount()/getDocumentsCount() are backed by a stats
	// poller — tests only read them inside retryable assertions, so eventual
	// consistency is sufficient.
	let stats = { connections: 0, documents: 0 };
	const poller = setInterval(async () => {
		try {
			stats = await controlStats();
		} catch {
			// server may be shutting down between polls
		}
	}, 50);
	(poller as { unref?: () => void }).unref?.();
	t.teardown(() => clearInterval(poller));

	// The shim: everything the Tier-1 tests and the provider utils touch.
	const shim = {
		server: {
			webSocketURL: `ws://${baseURL}`,
			URL: baseURL,
		},
		address: { address: "127.0.0.1", port: ready.port, family: "IPv4" },
		async closeConnections() {
			await fetch(`http://${baseURL}/control/close-connections`, { method: "POST" });
		},
		// server.documents.get(name)?.broadcastStateless(payload) — via the
		// control API instead of the in-process map.
		documents: {
			get: (documentName: string) => ({
				broadcastStateless: (payload: string) =>
					fetch(`http://${baseURL}/control/broadcast-stateless`, {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ documentName, payload }),
					}),
			}),
		},
		controlStats,
		getConnectionsCount: () => stats.connections,
		getDocumentsCount: () => stats.documents,
	};

	return shim as unknown as Hocuspocus;
};
