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

	// Hook closures are mutable so the shim's `configure()` (TS
	// `server.configure({...})`) can swap them in after the binary spawned;
	// the receiver always runs and dispatches whatever is present at event
	// time.
	const liveOptions: Partial<ServerConfiguration> = { ...(options ?? {}) };
	{
		const Y = await import("yjs");
		const receiver = http.createServer((request, response) => {
			const chunks: Buffer[] = [];
			request.on("data", (chunk) => chunks.push(chunk));
			request.on("end", async () => {
				const body = Buffer.concat(chunks);
				try {
					// Binary persistence requests carry the connection's auth
					// context in a request header.
					const headerContext = JSON.parse(
						String(request.headers["x-hocuspocus-context"] ?? "{}"),
					);
					const documentMatch = request.url?.match(/^\/documents\/(.+)$/);
					if (documentMatch && request.method === "GET") {
						// Binary persistence fetch → onLoadDocument closure.
						const documentName = decodeURIComponent(documentMatch[1]);
						if (!liveOptions.onLoadDocument) {
							response.writeHead(404).end();
							return;
						}
						const document = new Y.Doc();
						const returned = await liveOptions.onLoadDocument({
							document,
							documentName,
							context: headerContext,
							instance: undefined,
						} as never);
						// TS only adopts the return value when it is a Y.Doc;
						// anything else (true, undefined, …) keeps `document`.
						const state = Y.encodeStateAsUpdate(returned instanceof Y.Doc ? returned : document);
						response.writeHead(200, { "Content-Type": "application/octet-stream" });
						response.end(Buffer.from(state));
						return;
					}
					if (documentMatch && request.method === "PUT") {
						// Binary persistence store → onStoreDocument closure.
						const documentName = decodeURIComponent(documentMatch[1]);
						if (liveOptions.onStoreDocument) {
							const document = new Y.Doc();
							Y.applyUpdate(document, new Uint8Array(body));
							await liveOptions.onStoreDocument({
								document,
								documentName,
								state: body,
								context: headerContext,
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
						// The onConnect return value becomes context data,
						// echoed back so the server merges it into the
						// connection context (TS contextAdditions).
						const returned = await liveOptions.onConnect?.({
							documentName: payload.documentName,
							context: {},
							connectionConfig,
							connection: connectionConfig,
							requestHeaders: {},
							requestParameters: new URLSearchParams(),
						} as never);
						response.writeHead(200, { "Content-Type": "application/json" });
						response.end(JSON.stringify({ context: returned ?? {} }));
						return;
					}
					if (event === "stateless") {
						// connection.sendStateless replies to the sender via the
						// webhook response's `respond` field.
						let respond: string | undefined;
						await liveOptions.onStateless?.({
							documentName: payload.documentName,
							payload: payload.payload,
							context: payload.context ?? {},
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
						await liveOptions.onDisconnect?.({
							documentName: payload.documentName,
							context: payload.context ?? {},
						} as never);
						response.writeHead(200, { "Content-Type": "application/json" });
						response.end(JSON.stringify({}));
						return;
					}
					if (!liveOptions.onAuthenticate) {
						response.writeHead(200, { "Content-Type": "application/json" });
						response.end(JSON.stringify({ context: {}, scope: "read-write" }));
						return;
					}
					const context = await liveOptions.onAuthenticate({
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
					// TS contract: only an explicit `reason` property reaches
					// the client (`error.reason ?? 'permission-denied'`) —
					// plain Error messages do not leak.
					response.writeHead(403, { "Content-Type": "application/json" });
					response.end(
						JSON.stringify({
							reason: (error as { reason?: string })?.reason ?? "permission-denied",
						}),
					);
				}
			});
		});
		await new Promise<void>((resolve) => receiver.listen(0, "127.0.0.1", resolve));
		const receiverPort = (receiver.address() as { port: number }).port;
		// Nothing the shim holds may keep the ava worker's event loop
		// alive: when a test fails inside a bare timer (uncaught exception)
		// the worker dies WITHOUT running teardowns, and one ref'd handle
		// turns that lost worker into a whole-batch hang after the summary.
		receiver.unref();
		receiver.on("connection", (socket) => socket.unref());
		t.teardown(() => receiver.close());
		// Each webhook hop is a round trip through THIS process's event
		// loop, which is saturated during a full-batch run — an always-on
		// `connect` event reliably blew the suite's tightest fixed deadline
		// (hasUnsyncedChanges' 200 ms readonly test). So every channel is
		// enabled only when the test needs it: lifecycle events when
		// lifecycle hooks were passed up front, or when the server was
		// created bare — the `server.configure({...})`-after-construction
		// pattern, whose hooks merge into the live dispatch later.
		env.HOCUSPOCUS_WEBHOOK__URL = `http://127.0.0.1:${receiverPort}`;
		env.HOCUSPOCUS_WEBHOOK__SECRET = "test-secret";
		const bare = Object.keys(options ?? {}).length === 0;
		if (bare || options?.onConnect || options?.onDisconnect || options?.onStateless)
			env.HOCUSPOCUS_WEBHOOK__EVENTS = "connect,disconnect,stateless";
		if (options?.onAuthenticate) env.HOCUSPOCUS_AUTH__MODE = "webhook";
		if (options?.onLoadDocument || options?.onStoreDocument) env.HOCUSPOCUS_STORAGE__BACKEND = "webhook";
	}

	// stderr must NOT be "inherit": the child would hold the ava worker's
	// stderr pipe, and if the worker crashes without running teardowns the
	// orphaned server keeps that pipe open forever — ava's main process
	// waits for its EOF and the whole run hangs after the summary. Set
	// HOCUSPOCUS_RUST_STDERR=inherit locally when server logs are needed.
	const child = spawn(binary, [], {
		env,
		stdio: [
			"ignore",
			"pipe",
			process.env.HOCUSPOCUS_RUST_STDERR === "inherit" ? "inherit" : "ignore",
		],
	});

	const readyLine: string = await new Promise((resolve, reject) => {
		child.stdout.once("data", (data) => resolve(String(data).split("\n")[0]));
		child.once("error", reject);
		child.once("exit", (code) => reject(new Error(`rust server exited early: ${code}`)));
	});
	const ready = JSON.parse(readyLine);
	const baseURL = `127.0.0.1:${ready.port}`;

	// Same rule as the receiver: the child's process watch and stdout pipe
	// must not hold the worker's event loop open if teardowns are skipped.
	// Nothing is read from stdout after the ready line (QUIET=true).
	child.stdout.destroy();
	child.unref();

	t.teardown(() => {
		child.kill("SIGKILL");
	});

	// Plain node:http with no agent: fetch()'s global undici dispatcher
	// keeps ref'd keep-alive sockets in its pool, and a 50 ms poller
	// re-establishes them forever — one more way a crashed worker (skipped
	// teardowns) can never drain its event loop. agent:false gives one
	// unref'd, non-pooled socket per request instead.
	const controlStats = () =>
		new Promise<{ connections: number; documents: number }>((resolve, reject) => {
			const request = http.get(`http://${baseURL}/control/stats`, { agent: false }, (response) => {
				const chunks: Buffer[] = [];
				response.on("data", (chunk) => chunks.push(chunk));
				response.on("end", () => {
					try {
						resolve(JSON.parse(Buffer.concat(chunks).toString()));
					} catch (error) {
						reject(error);
					}
				});
			});
			request.on("socket", (socket) => socket.unref());
			request.on("error", reject);
		});

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
		// TS `server.configure({...})` after construction: hook closures
		// merge into the live receiver dispatch. Scalar server options
		// cannot change post-spawn; tests relying on that stay skipped.
		configure(config: Partial<ServerConfiguration>) {
			Object.assign(liveOptions, config);
			return shim;
		},
		server: {
			webSocketURL: `ws://${baseURL}`,
			URL: baseURL,
		},
		address: { address: "127.0.0.1", port: ready.port, family: "IPv4" },
		async closeConnections() {
			await fetch(`http://${baseURL}/control/close-connections`, { method: "POST" });
		},
		// server.documents.get(name)?.broadcastStateless(payload) — via the
		// control API instead of the in-process map. `size` is backed by
		// the stats poller, like getDocumentsCount().
		documents: {
			get size() {
				return stats.documents;
			},
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
