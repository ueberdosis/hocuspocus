import { AsyncLocalStorage } from "node:async_hooks";
import type Connection from "../Connection.ts";
import { isTransactionOrigin } from "../types.ts";

/**
 * The connection a hook is running for. Exposed via {@link getActiveContext}
 * so logging, tracing and metrics can recover per-connection information
 * (authentication details, correlation ids, tenant, …) without threading it
 * through every call.
 */
export interface ActiveContext<Context = any> {
	/**
	 * The connection's context object, as populated by the `onConnect` /
	 * `onAuthenticate` / `onTokenSync` hooks (or the context passed to
	 * `openDirectConnection`).
	 */
	context: Context;

	documentName: string;

	/**
	 * The socket id of the connection. Empty for changes made through a
	 * `DirectConnection`.
	 */
	socketId: string;
}

// Kept on globalThis so the CJS and the ESM build of this package (which can
// both be loaded in one process) share a single storage.
const storageKey = Symbol.for("@hocuspocus/server/activeContext");
const globalStore = globalThis as {
	[storageKey]?: AsyncLocalStorage<ActiveContext>;
};
const activeContextStorage = (globalStore[storageKey] ??=
	new AsyncLocalStorage<ActiveContext>());

/**
 * Works out which connection a hook payload belongs to. Returns `undefined`
 * for hooks that don't run on behalf of a single connection (store, unload,
 * server lifecycle, changes from Redis or unknown origins, …).
 */
export function activeContextFromPayload(
	payload: any,
): ActiveContext | undefined {
	if (payload === null || typeof payload !== "object") {
		return undefined;
	}

	const connection: Connection | undefined = payload.connection;
	if (connection) {
		return {
			context: payload.context ?? connection.context,
			documentName: payload.documentName ?? connection.document.name,
			socketId: connection.socketId,
		};
	}

	// onChange, beforeHandleAwareness, onAwarenessUpdate: the transaction origin
	// decides. Connection origins are handled above via payload.connection.
	if ("transactionOrigin" in payload) {
		const origin = payload.transactionOrigin;
		if (isTransactionOrigin(origin) && origin.source === "local") {
			return {
				context: origin.context ?? {},
				documentName: payload.documentName,
				socketId: "",
			};
		}
		return undefined;
	}

	// onConnect, onAuthenticate, onCreateDocument, onLoadDocument, …
	if (payload.context !== undefined && typeof payload.socketId === "string") {
		return {
			context: payload.context,
			documentName: payload.documentName,
			socketId: payload.socketId,
		};
	}

	return undefined;
}

/**
 * Runs `fn` with the given active context, or with none at all when
 * `activeContext` is undefined (so an outer scope never leaks into it).
 * Promises and timers created inside `fn` keep that context.
 */
export function runWithActiveContext<T>(
	activeContext: ActiveContext | undefined,
	fn: () => T,
): T {
	return activeContext === undefined
		? activeContextStorage.exit(fn)
		: activeContextStorage.run(activeContext, fn);
}

/**
 * Returns the connection the currently running hook belongs to (and any code
 * that hook calls), or `undefined` outside of hooks and in hooks that don't
 * run for a single connection, like `onStoreDocument` or `afterUnloadDocument`.
 */
export function getActiveContext<
	Context = any,
>(): ActiveContext<Context> | undefined {
	return activeContextStorage.getStore() as
		| ActiveContext<Context>
		| undefined;
}
