import { useCallback, useSyncExternalStore } from "react";

import type { SyncStatus } from "../types.ts";
import { useHocuspocusProvider } from "./useHocuspocusProvider.ts";

/**
 * Subscribe to the sync status of local changes.
 *
 * This hook indicates whether local changes have been synced with the server.
 *
 * @returns The current sync status: 'synced' or 'syncing'
 *
 * @example
 * ```tsx
 * function SaveIndicator() {
 *   const syncStatus = useHocuspocusSyncStatus()
 *
 *   return (
 *     <div>
 *       {syncStatus === 'syncing' ? 'Saving...' : 'All changes saved'}
 *     </div>
 *   )
 * }
 * ```
 */
export function useHocuspocusSyncStatus(): SyncStatus {
	const provider = useHocuspocusProvider();

	const subscribe = useCallback(
		(onStoreChange: () => void) => {
			provider.on("synced", onStoreChange);
			provider.on("unsyncedChanges", onStoreChange);

			return () => {
				provider.off("synced", onStoreChange);
				provider.off("unsyncedChanges", onStoreChange);
			};
		},
		[provider],
	);

	const getSnapshot = useCallback((): SyncStatus => {
		// Check if there are unsynced changes
		if (provider.unsyncedChanges > 0) {
			return "syncing";
		}
		return "synced";
	}, [provider]);

	return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
