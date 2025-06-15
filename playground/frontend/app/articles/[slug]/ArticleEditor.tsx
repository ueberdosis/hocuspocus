"use client";

import { SocketContext } from "@/app/SocketContext";
import CollaborationStatus from "@/app/articles/[slug]/CollaborationStatus";
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
			onOpen: (data) => console.log("onOpen!", data),
			onClose: (data) => console.log("onClose!", data),
			onAuthenticated: (data) => console.log("onAuthenticated!", data),
			onAuthenticationFailed: (data) =>
				console.log("onAuthenticationFailed", data),
			onUnsyncedChanges: (data) => console.log("onUnsyncedChanges", data),
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
		<div className="flex flex-col min-h-screen">
			{/* Header */}
			<header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700">
				<div className="px-8 py-6">
					<div className="flex items-center justify-between">
						<div>
							<h1 className="text-2xl font-bold text-slate-900 dark:text-white">
								Article #{slug}
							</h1>
							<p className="text-slate-600 dark:text-slate-400 mt-1">
								Collaborative editing session
							</p>
						</div>
					</div>
				</div>
			</header>

			{/* Main content */}
			<main className="flex-1 p-8">
				<div className="max-w-4xl mx-auto space-y-6">
					{/* Status Panel */}
					<CollaborationStatus provider={provider} />

					{/* Editor */}
					<div className="bg-white/30 dark:bg-slate-900/30 backdrop-blur-sm rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-xl">
						<CollaborativeEditor slug={slug} provider={provider} />
					</div>
				</div>
			</main>
		</div>
	);
}
