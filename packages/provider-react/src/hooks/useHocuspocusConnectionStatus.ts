import { useCallback, useRef, useSyncExternalStore } from "react";

import type { ConnectionStatus } from "../types.ts";
import { useHocuspocusProvider } from "./useHocuspocusProvider.ts";

/**
 * Subscribe to the connection status of the collaboration provider.
 *
 * This hook uses React's useSyncExternalStore for optimal integration with
 * concurrent rendering features.
 *
 * @returns The current connection status: 'connecting', 'connected', or 'disconnected'
 *
 * @example
 * ```tsx
 * function ConnectionIndicator() {
 *   const status = useHocuspocusConnectionStatus()
 *
 *   return (
 *     <div className={`status-${status}`}>
 *       {status === 'connected' ? 'Online' : status === 'connecting' ? 'Connecting...' : 'Offline'}
 *     </div>
 *   )
 * }
 * ```
 */
export function useHocuspocusConnectionStatus(): ConnectionStatus {
	const provider = useHocuspocusProvider();
	const statusRef = useRef<ConnectionStatus>(
		provider.configuration.websocketProvider.status as ConnectionStatus,
	);

	const subscribe = useCallback(
		(onStoreChange: () => void) => {
			const handleStatus = (data: { status: ConnectionStatus }) => {
				statusRef.current = data.status;
				onStoreChange();
			};

			provider.on("status", handleStatus);

			// Sync initial status in case it changed between render and subscribe
			const currentStatus = provider.configuration.websocketProvider
				.status as ConnectionStatus;
			if (statusRef.current !== currentStatus) {
				statusRef.current = currentStatus;
				onStoreChange();
			}

			return () => {
				provider.off("status", handleStatus);
			};
		},
		[provider],
	);

	const getSnapshot = useCallback((): ConnectionStatus => {
		return statusRef.current;
	}, []);

	return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
