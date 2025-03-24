"use client";

import { SocketContext } from "@/app/SocketContext";
import CollaborativeEditor from "@/app/articles/[slug]/CollaborativeEditor";
import { HocuspocusProvider } from "@hocuspocus/provider";
// import { TiptapCollabProvider } from "@tiptap-cloud/provider";
import { useContext, useEffect, useState } from "react";

export default function ArticleEditor({ slug }: { slug: string }) {
	const socket = useContext(SocketContext);

	const [provider, setProvider] = useState<HocuspocusProvider>();

	useEffect(() => {
		if (!socket) return;

		// const _p = new TiptapCollabProvider({
		const _p = new HocuspocusProvider({
			websocketProvider: socket,
			name: slug,
			onOpen: () => console.log("onOpen!"),
			onClose: () => console.log("onClose!"),
			onAuthenticated: () => console.log("onAuthenticated!"),
			onAuthenticationFailed: (data) =>
				console.log("onAuthenticationFailed", data),
		});

		setProvider(_p);

		return () => {
			_p.detach();
		};
	}, [socket, slug]);

	if (!provider) {
		return <></>;
	}

	// you need to attach here, to make sure the connection gets properly established due to React strict-mode re-run of hooks
	provider.attach();

	return (
		<div>
			<h1>Article editor!</h1>

			<CollaborativeEditor slug={slug} provider={provider} />
		</div>
	);
}
