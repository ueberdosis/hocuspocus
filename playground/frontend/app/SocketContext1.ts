"use client";

import type { HocuspocusProviderWebsocket } from "@hocuspocus/provider";
import { createContext } from "react";

export const SocketContext1 = createContext<HocuspocusProviderWebsocket | null>(
	null,
);
