"use client";

import { SocketContext } from "@/app/SocketContext";
import { HocuspocusProviderWebsocket } from "@hocuspocus/provider";
// import {
// 	TiptapCollabProvider,
// 	TiptapCollabProviderWebsocket,
// } from "@tiptap-cloud/provider";
import { useEffect, useState } from "react";

export default function Layout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const [socket, setSocket] = useState<HocuspocusProviderWebsocket | null>(
		null,
	);

	useEffect(() => {
		const newlyCreatedSocket = new HocuspocusProviderWebsocket({
			url: "ws://localhost:1235",
		});
		// const newlyCreatedSocket = new TiptapCollabProviderWebsocket({
		// 	appId: "",
		// });

		setSocket(newlyCreatedSocket);

		return () => {
			newlyCreatedSocket?.destroy();
		};
	}, []);

	if (socket) {
		return <SocketContext value={socket}>{children}</SocketContext>;
	}
}
