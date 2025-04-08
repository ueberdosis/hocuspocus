"use client";

import { SocketContext } from "@/app/SocketContext";
import CollaborativeEditor from "@/app/articles/[slug]/CollaborativeEditor";
import { HocuspocusProvider } from "@hocuspocus/provider";
// import { TiptapCollabProvider } from "@tiptap-cloud/provider";
import { useContext, useEffect, useState } from "react";
import CollaborationStatus from "@/app/articles/[slug]/CollaborationStatus";

export default function ArticleEditor({ slug }: { slug: string }) {
	const socket = useContext(SocketContext);

	const [provider, setProvider] = useState<HocuspocusProvider>();

	useEffect(() => {
		if (!socket) return;

		// const _p = new TiptapCollabProvider({
		const _p = new HocuspocusProvider({
			websocketProvider: socket,
			name: slug,
			onOpen: (data) => console.log("onOpen!", data),
			onClose: (data) => console.log("onClose!", data),
			onAuthenticated: (data) => console.log("onAuthenticated!", data),
			onAuthenticationFailed: (data) =>
				console.log("onAuthenticationFailed", data),
      onUnsyncedChanges: (data) =>
        console.log("onUnsyncedChanges", data)
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
			<h1>Editor for article #{slug}</h1>

      <CollaborationStatus provider={provider}/>

			<CollaborativeEditor slug={slug} provider={provider} />
		</div>
	);
}
