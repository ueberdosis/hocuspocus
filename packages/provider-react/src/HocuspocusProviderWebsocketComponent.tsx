"use client";

import { HocuspocusProviderWebsocket } from "@hocuspocus/provider";
import { useEffect, useMemo, useRef } from "react";

import { HocuspocusContext } from "./context.ts";
import type { HocuspocusProviderWebsocketComponentProps } from "./types.ts";

/**
 * HocuspocusProviderWebsocketComponent manages the WebSocket connection that is shared across all rooms.
 *
 * This component creates a single WebSocket connection that can be used by multiple
 * HocuspocusRoom components, preventing connection overhead when switching between documents.
 *
 * @example
 * ```tsx
 * <HocuspocusProviderWebsocketComponent url="ws://localhost:1234">
 *   <HocuspocusRoom name="document-1">
 *     <Editor />
 *   </HocuspocusRoom>
 * </HocuspocusProviderWebsocketComponent>
 * ```
 */
export function HocuspocusProviderWebsocketComponent({
	children,
	url,
	websocketProvider: externalWebsocketProvider,
}: HocuspocusProviderWebsocketComponentProps) {
	const websocketRef = useRef<HocuspocusProviderWebsocket | null>(null);
	const destroyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Create WebSocket provider once on mount.
	// Safe in StrictMode: useRef persists across double-renders, so the instance
	// is created only once. The deferred destruction in the effect below ensures
	// the second mount cancels the pending destroy before it fires.
	if (!websocketRef.current && !externalWebsocketProvider) {
		websocketRef.current = new HocuspocusProviderWebsocket({
			url: url!,
		});
	}

	const websocketProvider =
		externalWebsocketProvider ??
		(websocketRef.current as HocuspocusProviderWebsocket);

	// Cleanup on unmount with deferred destruction to handle StrictMode double-mount
	useEffect(() => {
		if (destroyTimeoutRef.current) {
			clearTimeout(destroyTimeoutRef.current);
			destroyTimeoutRef.current = null;
		}

		return () => {
			// Only destroy if we created the websocket (not externally provided)
			if (!externalWebsocketProvider) {
				destroyTimeoutRef.current = setTimeout(() => {
					if (websocketRef.current) {
						websocketRef.current.destroy();
						websocketRef.current = null;
					}
				}, 0);
			}
		};
	}, [externalWebsocketProvider]);

	const contextValue = useMemo(
		() => ({
			websocketProvider,
		}),
		[websocketProvider],
	);

	return (
		<HocuspocusContext.Provider value={contextValue}>
			{children}
		</HocuspocusContext.Provider>
	);
}
