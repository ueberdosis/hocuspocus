import { useCallback, useRef, useSyncExternalStore } from "react";

import type { ConnectionStatus } from "../types.ts";
import { useHocuspocus } from "./useHocuspocus.ts";

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
 *   const status = useConnectionStatus()
 *
 *   return (
 *     <div className={`status-${status}`}>
 *       {status === 'connected' ? 'Online' : status === 'connecting' ? 'Connecting...' : 'Offline'}
 *     </div>
 *   )
 * }
 * ```
 */
export function useConnectionStatus(): ConnectionStatus {
	const provider = useHocuspocus();
	// Track connection status via events since the provider doesn't expose a status property
	const statusRef = useRef<ConnectionStatus>("connecting");

	const subscribe = useCallback(
		(onStoreChange: () => void) => {
			const handleConnect = () => {
				statusRef.current = "connected";
				onStoreChange();
			};

			const handleDisconnect = () => {
				statusRef.current = "disconnected";
				onStoreChange();
			};

			provider.on("connect", handleConnect);
			provider.on("disconnect", handleDisconnect);

			// Set initial status based on current state
			if (provider.isSynced) {
				statusRef.current = "connected";
			}

			return () => {
				provider.off("connect", handleConnect);
				provider.off("disconnect", handleDisconnect);
			};
		},
		[provider],
	);

	const getSnapshot = useCallback((): ConnectionStatus => {
		return statusRef.current;
	}, []);

	return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
