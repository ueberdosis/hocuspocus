"use client";

import {
	HocuspocusProviderComponent,
	HocuspocusRoom,
} from "@hocuspocus/provider-react";
import React from "react";
import CollaborationStatus from "./CollaborationStatus";
import CollaborativeEditor from "./CollaborativeEditor";
import ConnectedUsers from "./ConnectedUsers";

export default function ArticleEditor({ slug }: { slug: string }) {
	return (
		<div className="flex flex-col min-h-screen">
			{/* Header */}
			<header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700">
				<div className="px-8 py-6">
					<div className="flex items-center justify-between">
						<div>
							<h1 className="text-2xl font-bold text-slate-900 dark:text-white">
								Article #{slug}
								<span className="ml-3 text-sm font-medium text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30 px-2 py-1 rounded-full">
									provider-react
								</span>
							</h1>
							<p className="text-slate-600 dark:text-slate-400 mt-1">
								Using @hocuspocus/provider-react hooks and components
							</p>
						</div>
					</div>
				</div>
			</header>

			{/* Main content */}
			<main className="flex-1 p-8">
				<div className="max-w-7xl mx-auto space-y-6">
					{/* Two independent WebSocket connections, each with its own room */}
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
						{/* Editor 1 — own WebSocket */}
						<HocuspocusProviderComponent url="ws://localhost:8000">
							<HocuspocusRoom name={slug}>
								<div className="space-y-4">
									<div className="flex items-center justify-between">
										<h2 className="text-lg font-semibold text-slate-900 dark:text-white">
											Editor 1
										</h2>
										<span className="text-sm text-slate-500 dark:text-slate-400">
											Independent WebSocket
										</span>
									</div>

									<CollaborationStatus />

									<ConnectedUsers />

									<div className="bg-white/30 dark:bg-slate-900/30 backdrop-blur-sm rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-xl">
										<CollaborativeEditor />
									</div>
								</div>
							</HocuspocusRoom>
						</HocuspocusProviderComponent>

						{/* Editor 2 — own WebSocket */}
						<HocuspocusProviderComponent url="ws://localhost:8000">
							<HocuspocusRoom name={slug}>
								<div className="space-y-4">
									<div className="flex items-center justify-between">
										<h2 className="text-lg font-semibold text-slate-900 dark:text-white">
											Editor 2
										</h2>
										<span className="text-sm text-slate-500 dark:text-slate-400">
											Independent WebSocket
										</span>
									</div>

									<CollaborationStatus />

									<ConnectedUsers />

									<div className="bg-white/30 dark:bg-slate-900/30 backdrop-blur-sm rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-xl">
										<CollaborativeEditor />
									</div>
								</div>
							</HocuspocusRoom>
						</HocuspocusProviderComponent>
					</div>

					{/* Info panel */}
					<div className="bg-purple-50/50 dark:bg-purple-900/20 backdrop-blur-sm rounded-xl border border-purple-200 dark:border-purple-700 p-6">
						<div className="flex items-start space-x-3">
							<div className="flex-shrink-0">
								<div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/40 rounded-full flex items-center justify-center">
									<svg
										className="w-4 h-4 text-purple-600 dark:text-purple-400"
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
								<h3 className="text-sm font-medium text-purple-900 dark:text-purple-100">
									@hocuspocus/provider-react Demo
								</h3>
								<p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
									This demo uses the new React-specific package. Each editor is
									wrapped in its own{" "}
									<code className="bg-purple-200/50 dark:bg-purple-800/50 px-1 rounded">
										HocuspocusProviderComponent
									</code>{" "}
									(independent WebSocket) and{" "}
									<code className="bg-purple-200/50 dark:bg-purple-800/50 px-1 rounded">
										HocuspocusRoom
									</code>
									. Status is read via{" "}
									<code className="bg-purple-200/50 dark:bg-purple-800/50 px-1 rounded">
										useHocuspocusConnectionStatus()
									</code>
									,{" "}
									<code className="bg-purple-200/50 dark:bg-purple-800/50 px-1 rounded">
										useHocuspocusSyncStatus()
									</code>
									, and{" "}
									<code className="bg-purple-200/50 dark:bg-purple-800/50 px-1 rounded">
										useHocuspocusAwareness()
									</code>{" "}
									hooks &mdash; no manual event listeners needed.
								</p>
							</div>
						</div>
					</div>
				</div>
			</main>
		</div>
	);
}
