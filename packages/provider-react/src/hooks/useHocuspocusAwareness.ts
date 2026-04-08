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

	const versionRef = useRef(0);
	const cacheRef = useRef<{ users: CollabUser[]; version: number }>({
		users: [],
		version: -1,
	});

	const subscribe = useCallback(
		(onStoreChange: () => void) => {
			const onChange = () => {
				versionRef.current++;
				onStoreChange();
			};
			provider.awareness?.on("change", onChange);
			return () => {
				provider.awareness?.off("change", onChange);
			};
		},
		[provider],
	);

	const getSnapshot = useCallback(() => {
		const awareness = provider.awareness;
		if (!awareness) {
			return [];
		}

		// Return cached value if awareness hasn't changed since last snapshot
		if (cacheRef.current.version === versionRef.current) {
			return cacheRef.current.users;
		}

		const users: CollabUser[] = [];
		awareness.getStates().forEach((state, clientId) => {
			users.push({
				clientId,
				...state,
			});
		});

		cacheRef.current = { users, version: versionRef.current };
		return users;
	}, [provider]);

	return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
