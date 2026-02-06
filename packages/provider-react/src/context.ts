import { createContext } from "react";

import type {
	HocuspocusContextValue,
	HocuspocusRoomContextValue,
} from "./types.ts";

/**
 * Context for the WebSocket connection shared across rooms
 */
export const HocuspocusContext =
	createContext<HocuspocusContextValue | null>(null);

/**
 * Context for the room/document provider
 */
export const HocuspocusRoomContext =
	createContext<HocuspocusRoomContextValue | null>(null);
