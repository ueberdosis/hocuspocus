import type { ServerConfiguration } from "@hocuspocus/server";
import type { ExecutionContext } from "ava";
import { newHocuspocus } from "./newHocuspocus.ts";

/**
 * A Hocuspocus server that serves the HTTP fallback transports.
 *
 * It listens on 127.0.0.1 only. A server that listens on all interfaces, as
 * `newHocuspocus` does by default, can be given a port that another program
 * on the machine already holds on 127.0.0.1 (macOS allows that). The requests
 * of the test then reach that program instead of the server.
 */
export const newHocuspocusWithHttpFallback = (
	t: ExecutionContext,
	options?: Partial<ServerConfiguration>,
) => newHocuspocus(t, { address: "127.0.0.1", httpFallback: true, ...options });
