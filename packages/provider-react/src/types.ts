import type {
	HocuspocusProvider,
	HocuspocusProviderWebsocket,
	onAuthenticatedParameters,
	onAuthenticationFailedParameters,
	onAwarenessChangeParameters,
	onAwarenessUpdateParameters,
	onCloseParameters,
	onDisconnectParameters,
	onMessageParameters,
	onOpenParameters,
	onOutgoingMessageParameters,
	onStatelessParameters,
	onStatusParameters,
	onSyncedParameters,
	onUnsyncedChangesParameters,
} from "@hocuspocus/provider";
import type { ReactNode } from "react";
import type * as Y from "yjs";

/**
 * Configuration for HocuspocusProvider component.
 *
 * Provide either a `url` to create a managed WebSocket connection,
 * or a `websocketProvider` instance for full control — but not both.
 */
export type HocuspocusProviderWebsocketComponentProps = {
	children: ReactNode;
} & (
	| {
			/**
			 * URL of your @hocuspocus/server instance
			 */
			url: string;
			websocketProvider?: never;
	  }
	| {
			url?: never;
			/**
			 * Provide your own websocket instance for full control
			 */
			websocketProvider: HocuspocusProviderWebsocket;
	  }
);

/**
 * Map of HocuspocusProvider event names to their payload types.
 * Used by `useHocuspocusEvent` and the `HocuspocusRoom` event handler props.
 */
export interface HocuspocusProviderEvents {
	open: onOpenParameters;
	connect: undefined;
	close: onCloseParameters;
	disconnect: onDisconnectParameters;
	status: onStatusParameters;
	synced: onSyncedParameters;
	unsyncedChanges: onUnsyncedChangesParameters;
	message: onMessageParameters;
	outgoingMessage: onOutgoingMessageParameters;
	stateless: onStatelessParameters;
	authenticated: onAuthenticatedParameters;
	authenticationFailed: onAuthenticationFailedParameters;
	awarenessUpdate: onAwarenessUpdateParameters;
	awarenessChange: onAwarenessChangeParameters;
	destroy: undefined;
}

/**
 * Configuration for HocuspocusRoom component
 */
export interface HocuspocusRoomProps {
	children: ReactNode;
	/**
	 * The document name (required)
	 */
	name: string;
	/**
	 * Optional: bring your own Y.Doc
	 */
	document?: Y.Doc;
	/**
	 * JWT token or function that returns a promise resolving to a token
	 */
	token?: string | (() => Promise<string>) | (() => string);

	// Event handlers — all optional, called when the provider emits the corresponding event.
	onOpen?: (data: onOpenParameters) => void;
	onConnect?: () => void;
	onClose?: (data: onCloseParameters) => void;
	onDisconnect?: (data: onDisconnectParameters) => void;
	onStatus?: (data: onStatusParameters) => void;
	onSynced?: (data: onSyncedParameters) => void;
	onUnsyncedChanges?: (data: onUnsyncedChangesParameters) => void;
	onMessage?: (data: onMessageParameters) => void;
	onOutgoingMessage?: (data: onOutgoingMessageParameters) => void;
	onStateless?: (data: onStatelessParameters) => void;
	onAuthenticated?: (data: onAuthenticatedParameters) => void;
	onAuthenticationFailed?: (data: onAuthenticationFailedParameters) => void;
	onAwarenessUpdate?: (data: onAwarenessUpdateParameters) => void;
	onAwarenessChange?: (data: onAwarenessChangeParameters) => void;
	onDestroy?: () => void;
}

/**
 * Context value for the WebSocket provider
 */
export interface HocuspocusContextValue {
	websocketProvider: HocuspocusProviderWebsocket;
}

/**
 * Context value for the room/document provider
 */
export interface HocuspocusRoomContextValue {
	provider: HocuspocusProvider;
}

/**
 * Connection status for the collaboration provider
 */
export type ConnectionStatus = "connecting" | "connected" | "disconnected";

/**
 * Sync status indicating whether local changes are synced with server
 */
export type SyncStatus = "synced" | "syncing";

/**
 * User information from awareness
 */
export interface CollabUser {
	clientId: number;
	[key: string]: unknown;
}
