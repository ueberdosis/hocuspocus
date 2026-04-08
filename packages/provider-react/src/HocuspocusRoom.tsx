"use client";

import { HocuspocusProvider } from "@hocuspocus/provider";
import { useContext, useEffect, useMemo, useRef, useState } from "react";

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

	const [provider, setProvider] = useState(
		() =>
			new HocuspocusProvider({
				name,
				websocketProvider,
				document,
				token,
			}),
	);

	const destroyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Recreate provider when name or document changes
	// biome-ignore lint/correctness/useExhaustiveDependencies: provider.configuration holds the previous values we compare against — not a reactive dependency
	useEffect(() => {
		if (
			provider.configuration.name !== name ||
			provider.configuration.document !== document
		) {
			provider.destroy();
			setProvider(
				new HocuspocusProvider({
					name,
					websocketProvider,
					document,
					// token is intentionally read from the current closure but not
					// included as a dependency — token refreshes should not destroy
					// the connection. Function tokens are called on-demand by the provider.
					token,
				}),
			);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [name, document, websocketProvider]);

	// Attach/detach lifecycle with deferred destruction for StrictMode
	useEffect(() => {
		if (destroyTimeoutRef.current) {
			clearTimeout(destroyTimeoutRef.current);
			destroyTimeoutRef.current = null;
		}

		provider.attach();

		return () => {
			destroyTimeoutRef.current = setTimeout(() => {
				provider.destroy();
			}, 0);
		};
	}, [provider]);

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
