import { useCallback, useRef, useSyncExternalStore } from "react";

import type { CollabUser } from "../types.ts";
import { useHocuspocusProvider } from "./useHocuspocusProvider.ts";

/**
 * Subscribe to the list of connected users in the document.
 *
 * This hook uses the Yjs awareness protocol to track users currently
 * connected to the document.
 *
 * @returns Array of user objects with their awareness state
 *
 * @example
 * ```tsx
 * function UserList() {
 *   const users = useHocuspocusAwareness()
 *
 *   return (
 *     <div className="avatars">
 *       {users.map(user => (
 *         <div
 *           key={user.clientId}
 *           style={{ backgroundColor: user.color }}
 *           title={user.name}
 *         >
 *           {user.name?.[0]}
 *         </div>
 *       ))}
 *     </div>
 *   )
 * }
 * ```
 */
export function useHocuspocusAwareness(): CollabUser[] {
	const provider = useHocuspocusProvider();

	// Cache the last snapshot to avoid unnecessary array allocations
	const cacheRef = useRef<{
		users: CollabUser[];
		json: string;
	} | null>(null);

	const subscribe = useCallback(
		(onStoreChange: () => void) => {
			provider.awareness?.on("change", onStoreChange);
			return () => {
				provider.awareness?.off("change", onStoreChange);
			};
		},
		[provider],
	);

	const getSnapshot = useCallback(() => {
		const awareness = provider.awareness;
		if (!awareness) {
			return [];
		}

		const users: CollabUser[] = [];
		awareness.getStates().forEach((state, clientId) => {
			users.push({
				clientId,
				...state,
			});
		});

		const json = JSON.stringify(users);

		// Return cached value if unchanged to preserve referential equality
		if (cacheRef.current && cacheRef.current.json === json) {
			return cacheRef.current.users;
		}

		cacheRef.current = { users, json };
		return users;
	}, [provider]);

	return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
