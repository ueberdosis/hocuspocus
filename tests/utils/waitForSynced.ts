import type { HocuspocusProvider } from "@hocuspocus/provider";
import { sleep } from "./sleep.ts";

/**
 * Wait until the provider is synced. Throws after `timeout` with the state of
 * its socket, so a stuck connection reports why instead of hanging until
 * AVA's timeout.
 */
export const waitForSynced = async (
	provider: HocuspocusProvider,
	timeout = 10_000,
) => {
	const deadline = Date.now() + timeout;
	while (!provider.isSynced) {
		if (Date.now() > deadline) {
			const { status, transport, webSocket } =
				provider.configuration.websocketProvider;
			throw new Error(
				`Not synced after ${timeout} ms: status ${status}, transport ${transport}, socket readyState ${webSocket?.readyState}`,
			);
		}
		await sleep(50);
	}
};
