"use client";

import type { HocuspocusProviderWebsocket } from "@hocuspocus/provider";
import { createContext } from "react";

export const SocketContext = createContext<HocuspocusProviderWebsocket | null>(
	null,
);
