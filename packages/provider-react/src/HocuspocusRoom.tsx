import { HocuspocusProvider } from "@hocuspocus/provider";
import { useContext, useEffect, useMemo, useRef } from "react";

import { HocuspocusContext, HocuspocusRoomContext } from "./context.ts";
import type { HocuspocusRoomProps } from "./types.ts";

/**
 * HocuspocusRoom manages the connection to a specific document.
 *
 * It uses the shared WebSocket from HocuspocusProviderComponent and creates a document-specific
 * provider that connects on mount and disconnects on unmount.
 *
 * This component handles React's StrictMode gracefully by using deferred destruction,
 * preventing unnecessary reconnections during development double-mounts.
 *
 * @example
 * ```tsx
 * <HocuspocusProviderComponent url="ws://localhost:1234">
 *   <HocuspocusRoom name="document-1">
 *     <Editor />
 *   </HocuspocusRoom>
 * </HocuspocusProviderComponent>
 * ```
 */
export function HocuspocusRoom({
	children,
	name,
	document,
	token,
}: HocuspocusRoomProps) {
	const hocuspocusContext = useContext(HocuspocusContext);

	if (!hocuspocusContext) {
		throw new Error(
			"HocuspocusRoom must be used within a HocuspocusProviderComponent",
		);
	}

	const { websocketProvider } = hocuspocusContext;

	const providerRef = useRef<HocuspocusProvider | null>(null);
	const destroyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Store current props in a ref to access in cleanup without triggering re-creation
	const propsRef = useRef({ name, document, token });
	propsRef.current = { name, document, token };

	// Create or retrieve provider
	// We use a ref to prevent recreation on every render
	if (!providerRef.current) {
		providerRef.current = new HocuspocusProvider({
			name,
			websocketProvider,
			document,
			token,
		});
	}

	const provider = providerRef.current;

	useEffect(() => {
		// Cancel any pending destruction (handles StrictMode double-mount)
		if (destroyTimeoutRef.current) {
			clearTimeout(destroyTimeoutRef.current);
			destroyTimeoutRef.current = null;
		}

		return () => {
			// Deferred destruction - wait for potential remount in StrictMode
			// Using setTimeout(0) allows React to remount before we destroy
			destroyTimeoutRef.current = setTimeout(() => {
				if (providerRef.current) {
					providerRef.current.destroy();
					providerRef.current = null;
				}
			}, 0);
		};
	}, []);

	// Handle document name changes - need to recreate provider
	useEffect(() => {
		// Skip on initial mount since we already created the provider
		if (
			providerRef.current &&
			providerRef.current.configuration.name !== name
		) {
			// Name changed, need to recreate provider
			providerRef.current.destroy();
			providerRef.current = new HocuspocusProvider({
				name,
				websocketProvider,
				document: propsRef.current.document,
				token: propsRef.current.token,
			});
		}
	}, [name, websocketProvider]);

	const contextValue = useMemo(
		() => ({
			provider,
		}),
		[provider],
	);

	return (
		<HocuspocusRoomContext.Provider value={contextValue}>
			{children}
		</HocuspocusRoomContext.Provider>
	);
}
