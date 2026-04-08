import { useEffect, useRef } from "react";

import type { HocuspocusProviderEvents } from "../types.ts";
import { useHocuspocusProvider } from "./useHocuspocusProvider.ts";

/**
 * Subscribe to events from the HocuspocusProvider for the current room.
 *
 * The handler is stored in a ref so the subscription stays stable even if
 * the handler identity changes between renders.
 *
 * Must be used within a HocuspocusRoom component.
 *
 * @param event - The event name to subscribe to
 * @param handler - Callback invoked when the event fires
 *
 * @example
 * ```tsx
 * function AuthGuard() {
 *   useHocuspocusEvent('authenticationFailed', (data) => {
 *     console.error('Auth failed:', data.reason)
 *     redirectToLogin()
 *   })
 *
 *   useHocuspocusEvent('close', (data) => {
 *     console.log('Connection closed', data.event)
 *   })
 *
 *   return null
 * }
 * ```
 */
export function useHocuspocusEvent<E extends keyof HocuspocusProviderEvents>(
	event: E,
	handler: HocuspocusProviderEvents[E] extends undefined
		? () => void
		: (data: HocuspocusProviderEvents[E]) => void,
): void {
	const provider = useHocuspocusProvider();
	const handlerRef = useRef(handler);
	handlerRef.current = handler;

	useEffect(() => {
		const listener = (...args: unknown[]) => {
			(handlerRef.current as (...a: unknown[]) => void)(...args);
		};
		provider.on(event, listener);
		return () => {
			provider.off(event, listener);
		};
	}, [provider, event]);
}
