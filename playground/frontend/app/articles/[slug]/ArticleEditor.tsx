"use client";

import { SocketContext1 } from "@/app/SocketContext1";
import { SocketContext2 } from "@/app/SocketContext2";
import CollaborationStatus from "@/app/articles/[slug]/CollaborationStatus";
import CollaborativeEditor from "@/app/articles/[slug]/CollaborativeEditor";
import {
	HocuspocusProvider,
	HocuspocusProviderWebsocket,
} from "@hocuspocus/provider";
// import { TiptapCollabProvider } from "@tiptap-cloud/provider";
import { useContext, useEffect, useState } from "react";

export default function ArticleEditor({ slug }: { slug: string }) {
	const socket1 = useContext(SocketContext1);
	const socket2 = useContext(SocketContext2);

	const [provider1, setProvider1] = useState<HocuspocusProvider>();
	const [provider2, setProvider2] = useState<HocuspocusProvider>();

	useEffect(() => {
		if (!socket1 || !socket2) return;

		// Create separate providers for each editor
		const _p1 = new HocuspocusProvider({
			websocketProvider: socket1,
			name: slug,
			onOpen: (data) => console.log("Editor 1 onOpen!", data),
			onClose: (data) => console.log("Editor 1 onClose!", data),
			onAuthenticated: (data) => console.log("Editor 1 onAuthenticated!", data),
			onAuthenticationFailed: (data) =>
				console.log("Editor 1 onAuthenticationFailed", data),
			onUnsyncedChanges: (data) =>
				console.log("Editor 1 onUnsyncedChanges", data),
		});

		const _p2 = new HocuspocusProvider({
			websocketProvider: socket2,
			name: slug,
			onOpen: (data) => console.log("Editor 2 onOpen!", data),
			onClose: (data) => console.log("Editor 2 onClose!", data),
			onAuthenticated: (data) => console.log("Editor 2 onAuthenticated!", data),
			onAuthenticationFailed: (data) =>
				console.log("Editor 2 onAuthenticationFailed", data),
			onUnsyncedChanges: (data) =>
				console.log("Editor 2 onUnsyncedChanges", data),
		});

		setProvider1(_p1);
		setProvider2(_p2);

		return () => {
			_p1.detach();
			_p2.detach();
		};
	}, [socket1, socket2, slug]);

	if (!provider1 || !provider2) {
		return <></>;
	}

	// you need to attach here, to make sure the connection gets properly established due to React strict-mode re-run of hooks
	provider1.attach();
	provider2.attach();

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
								Real-time collaborative editing - Two editors demonstrating sync
							</p>
						</div>
					</div>
				</div>
			</header>

			{/* Main content */}
			<main className="flex-1 p-8">
				<div className="max-w-7xl mx-auto space-y-6">
					{/* Editors side by side */}
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
						{/* Editor 1 */}
						<div className="space-y-4">
							<div className="flex items-center justify-between">
								<h2 className="text-lg font-semibold text-slate-900 dark:text-white">
									Editor 1
								</h2>
								<span className="text-sm text-slate-500 dark:text-slate-400">
									Independent WebSocket connection
								</span>
							</div>

							{/* Status Panel 1 */}
							<CollaborationStatus provider={provider1} />

							{/* Editor 1 */}
							<div className="bg-white/30 dark:bg-slate-900/30 backdrop-blur-sm rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-xl">
								<CollaborativeEditor slug={slug} provider={provider1} />
							</div>
						</div>

						{/* Editor 2 */}
						<div className="space-y-4">
							<div className="flex items-center justify-between">
								<h2 className="text-lg font-semibold text-slate-900 dark:text-white">
									Editor 2
								</h2>
								<span className="text-sm text-slate-500 dark:text-slate-400">
									Independent WebSocket connection
								</span>
							</div>

							{/* Status Panel 2 */}
							<CollaborationStatus provider={provider2} />

							{/* Editor 2 */}
							<div className="bg-white/30 dark:bg-slate-900/30 backdrop-blur-sm rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-xl">
								<CollaborativeEditor slug={slug} provider={provider2} />
							</div>
						</div>
					</div>

					{/* Info panel */}
					<div className="bg-blue-50/50 dark:bg-blue-900/20 backdrop-blur-sm rounded-xl border border-blue-200 dark:border-blue-700 p-6">
						<div className="flex items-start space-x-3">
							<div className="flex-shrink-0">
								<div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center">
									<svg
										className="w-4 h-4 text-blue-600 dark:text-blue-400"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
										/>
									</svg>
								</div>
							</div>
							<div>
								<h3 className="text-sm font-medium text-blue-900 dark:text-blue-100">
									Real-time Collaboration Demo
								</h3>
								<p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
									Both editors are connected to the same document but use
									separate WebSocket connections. Changes made in one editor
									will appear in the other in real-time. Try typing in either
									editor or use the connection controls to test synchronization
									behavior.
								</p>
							</div>
						</div>
					</div>
				</div>
			</main>
		</div>
	);
}
