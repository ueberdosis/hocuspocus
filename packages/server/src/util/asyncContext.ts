import { AsyncLocalStorage } from "node:async_hooks";

/**
 * The connection context that is active while an inbound message is being
 * processed. Exposed via {@link getActiveContext} so logging, tracing and
 * metrics can recover per-connection information (authentication details,
 * correlation ids, tenant, …) without threading it through every call.
 */
export interface ActiveContext<Context = any> {
	/**
	 * The connection's context object, as populated by the `onConnect` /
	 * `onAuthenticate` hooks.
	 */
	context: Context;

	documentName: string;

	socketId: string;
}

const activeContextStorage = new AsyncLocalStorage<ActiveContext>();

/**
 * Runs `fn` with the given connection context bound to the current async call
 * chain. Hocuspocus wraps inbound message processing with this so anything that
 * runs while a message is handled — hooks and any code they call — can read the
 * active connection via {@link getActiveContext}.
 */
export function runWithActiveContext<T>(
	activeContext: ActiveContext,
	fn: () => T,
): T {
	return activeContextStorage.run(activeContext, fn);
}

/**
 * Returns the connection context that is currently processing an inbound
 * message, or `undefined` when called outside of message processing.
 */
export function getActiveContext<
	Context = any,
>(): ActiveContext<Context> | undefined {
	return activeContextStorage.getStore() as
		| ActiveContext<Context>
		| undefined;
}
