import type { HocuspocusProvider, HocuspocusProviderWebsocket } from "@hocuspocus/provider";
import type { ReactNode } from "react";
import type * as Y from "yjs";

/**
 * Configuration for HocuspocusProvider component
 */
export interface HocuspocusProviderComponentProps {
	children: ReactNode;
	/**
	 * URL of your @hocuspocus/server instance
	 */
	url?: string;
	/**
	 * Optional: provide your own websocket instance for full control
	 */
	websocketProvider?: HocuspocusProviderWebsocket;
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
