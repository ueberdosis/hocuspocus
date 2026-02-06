import { useCallback, useRef } from "react";

/**
 * Creates a stable callback reference that always calls the latest version
 * of the callback without needing to include it in dependency arrays.
 *
 * This is useful for event handlers that need to access current props/state
 * but shouldn't cause effect re-runs when they change.
 *
 * @param callback - The callback function to stabilize
 * @returns A stable function reference that calls the latest callback
 */
// biome-ignore lint/suspicious/noExplicitAny: generic callback type requires any
export function useStableCallback<T extends (...args: any[]) => any>(
	callback: T,
): T {
	const callbackRef = useRef(callback);
	callbackRef.current = callback;

	return useCallback((...args: Parameters<T>) => {
		return callbackRef.current(...args);
	}, []) as T;
}
