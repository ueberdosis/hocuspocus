"use client";

import {
	useHocuspocusConnectionStatus,
	useHocuspocusProvider,
	useHocuspocusSyncStatus,
} from "@hocuspocus/provider-react";
import type { onUnsyncedChangesParameters } from "@hocuspocus/provider";
import { useEffect, useState } from "react";

const CollaborationStatus = () => {
	const provider = useHocuspocusProvider();
	const connectionStatus = useHocuspocusConnectionStatus();
	const syncStatus = useHocuspocusSyncStatus();
	const [unsyncedChanges, setUnsyncedChanges] = useState(0);

	useEffect(() => {
		const handler = (data: onUnsyncedChangesParameters) => {
			setUnsyncedChanges(data.number);
		};
		provider.on("unsyncedChanges", handler);
		return () => {
			provider.off("unsyncedChanges", handler);
		};
	}, [provider]);

	const getStatusColor = (status: string) => {
		switch (status) {
			case "connected":
				return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
			case "connecting":
				return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400";
			case "disconnected":
				return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
			default:
				return "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400";
		}
	};

	return (
		<div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm rounded-xl border border-slate-200 dark:border-slate-700 p-6">
			{/* Status indicators */}
			<div className="flex items-center justify-between mb-6">
				<h3 className="text-lg font-semibold text-slate-900 dark:text-white">
					Connection Status
				</h3>
				<div className="flex items-center space-x-4">
					<div className="flex items-center space-x-2">
						<div
							className={`w-3 h-3 rounded-full ${connectionStatus === "connected" ? "bg-green-500" : connectionStatus === "connecting" ? "bg-yellow-500" : "bg-red-500"}`}
						/>
						<span
							className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(connectionStatus)}`}
						>
							{connectionStatus}
						</span>
					</div>
					<div className="flex items-center space-x-2">
						<div
							className={`w-3 h-3 rounded-full ${syncStatus === "synced" ? "bg-green-500" : "bg-orange-500 animate-pulse"}`}
						/>
						<span
							className={`px-2 py-1 rounded-full text-xs font-medium ${syncStatus === "synced" ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400" : "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400"}`}
						>
							{syncStatus}
						</span>
					</div>
					<div className="flex items-center space-x-2">
						<div className="w-3 h-3 rounded-full bg-orange-500 animate-pulse" />
						<span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400">
							{unsyncedChanges} unsynced
						</span>
					</div>
				</div>
			</div>

			{/* Control buttons */}
			<div className="grid grid-cols-2 gap-6">
				<div className="space-y-3">
					<h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">
						WebSocket Controls
					</h4>
					<div className="flex space-x-2">
						<button
							className="flex-1 px-3 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							onClick={() =>
								provider.configuration.websocketProvider.disconnect()
							}
							disabled={connectionStatus === "disconnected"}
						>
							Disconnect
						</button>
						<button
							className="flex-1 px-3 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							onClick={() =>
								provider.configuration.websocketProvider.connect()
							}
							disabled={connectionStatus === "connected"}
						>
							Connect
						</button>
					</div>
				</div>

				<div className="space-y-3">
					<h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">
						Provider Controls
					</h4>
					<div className="flex space-x-2">
						<button
							className="flex-1 px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							onClick={() => provider.detach()}
						>
							Detach
						</button>
						<button
							className="flex-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							onClick={() => provider.attach()}
						>
							Attach
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default CollaborationStatus;
