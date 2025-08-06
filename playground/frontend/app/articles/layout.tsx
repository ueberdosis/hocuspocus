"use client";

import { SocketContext1 } from "@/app/SocketContext1";
import { SocketContext2 } from "@/app/SocketContext2";
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
	const [socket1, setSocket1] = useState<HocuspocusProviderWebsocket | null>(
		null,
	);
	const [socket2, setSocket2] = useState<HocuspocusProviderWebsocket | null>(
		null,
	);

	useEffect(() => {
		const newlyCreatedSocket1 = new HocuspocusProviderWebsocket({
			url: "ws://localhost:8000",
		});
		const newlyCreatedSocket2 = new HocuspocusProviderWebsocket({
			url: "ws://localhost:8000",
		});
		// const newlyCreatedSocket = new TiptapCollabProviderWebsocket({
		// 	appId: "",
		// });

		setSocket1(newlyCreatedSocket1);
		setSocket2(newlyCreatedSocket2);

		return () => {
			newlyCreatedSocket1?.destroy();
			newlyCreatedSocket2?.destroy();
		};
	}, []);

	if (socket1 && socket2) {
		return (
			<>
				<SocketContext1 value={socket1}>
					<SocketContext2 value={socket2}>{children}</SocketContext2>
				</SocketContext1>
			</>
		);
	}
}
