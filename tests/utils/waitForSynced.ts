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
			const websocketProvider = provider.configuration.websocketProvider;
			// Private; read for the failure message only.
			const { failedTransports } = websocketProvider as unknown as {
				failedTransports: Map<string, number>;
			};
			throw new Error(
				`Not synced after ${timeout} ms: status ${websocketProvider.status}, transport ${websocketProvider.transport}, socket readyState ${websocketProvider.webSocket?.readyState}, failed transports ${JSON.stringify([...failedTransports.keys()])}`,
			);
		}
		await sleep(50);
	}
};
