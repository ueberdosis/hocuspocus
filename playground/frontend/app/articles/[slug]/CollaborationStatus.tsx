import type {
	HocuspocusProvider,
	onStatusParameters,
	onUnsyncedChangesParameters,
} from "@hocuspocus/provider";
import { useEffect, useState } from "react";

const CollaborationStatus = (props: {
	provider: HocuspocusProvider;
}) => {
	const { provider } = props;

	const [unsyncedChanges, setUnsyncedChanges] = useState(0);
	const [socketStatus, setSocketStatus] = useState<string | null>(null);
	const [isAttached, _setAttached] = useState<boolean>(false);

	useEffect(() => {
		setSocketStatus(provider.configuration.websocketProvider.status);
		_setAttached(provider.isAttached);

		const handleUnsyncedChanges = (changes: onUnsyncedChangesParameters) => {
			setUnsyncedChanges(changes.number);
		};

		const handleSocketStatus = (status: onStatusParameters) => {
			setSocketStatus(status.status);
		};

		provider.on("unsyncedChanges", handleUnsyncedChanges);
		provider.configuration.websocketProvider.on("status", handleSocketStatus);

		return () => {
			provider.off("unsyncedChanges", handleUnsyncedChanges);
			provider.configuration.websocketProvider.off(
				"status",
				handleSocketStatus,
			);
		};
	}, [provider]);

	const updateAttached = (attach: boolean) => {
		if (attach) {
			provider.attach();
		} else {
			provider.detach();
		}

		_setAttached(provider.isAttached);
	};

	const getStatusColor = (status: string | null) => {
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

	const UNSYNCED_THRESHOLD = 10;

	return (
		<div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm rounded-xl border border-slate-200 dark:border-slate-700 p-6">
			{/* Alert banner when unsynced changes grow — indicates connection issues */}
			{unsyncedChanges >= UNSYNCED_THRESHOLD && (
				<div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center space-x-3">
					<div className="w-5 h-5 shrink-0 text-red-600 dark:text-red-400">
						<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
							/>
						</svg>
					</div>
					<div>
						<p className="text-sm font-medium text-red-800 dark:text-red-200">
							Connection issue detected
						</p>
						<p className="text-xs text-red-600 dark:text-red-400">
							{unsyncedChanges} changes are waiting to sync. Your edits are
							saved locally but not yet on the server.
						</p>
					</div>
				</div>
			)}

			{/* Status indicators */}
			<div className="flex items-center justify-between mb-6">
				<h3 className="text-lg font-semibold text-slate-900 dark:text-white">
					Connection Status
				</h3>
				<div className="flex items-center space-x-4">
					<div className="flex items-center space-x-2">
						<div
							className={`w-3 h-3 rounded-full ${socketStatus === "connected" ? "bg-green-500" : socketStatus === "connecting" ? "bg-yellow-500" : "bg-red-500"}`}
						></div>
						<span
							className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(socketStatus)}`}
						>
							{socketStatus || "Unknown"}
						</span>
					</div>
					<div className="flex items-center space-x-2">
						<div
							className={`w-3 h-3 rounded-full ${provider.isAttached ? "bg-green-500" : "bg-red-500"}`}
						></div>
						<span
							className={`px-2 py-1 rounded-full text-xs font-medium ${provider.isAttached ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400" : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"}`}
						>
							{isAttached ? "Attached" : "Detached"}
						</span>
					</div>
					<div className="flex items-center space-x-2">
						<div
							className={`w-3 h-3 rounded-full ${unsyncedChanges >= UNSYNCED_THRESHOLD ? "bg-red-500 animate-pulse" : "bg-orange-500 animate-pulse"}`}
						></div>
						<span
							className={`px-2 py-1 rounded-full text-xs font-medium ${unsyncedChanges >= UNSYNCED_THRESHOLD ? "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400" : "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400"}`}
						>
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
							disabled={socketStatus === "disconnected"}
						>
							Disconnect
						</button>
						<button
							className="flex-1 px-3 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							onClick={() => provider.configuration.websocketProvider.connect()}
							disabled={socketStatus === "connected"}
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
							onClick={() => updateAttached(false)}
							disabled={!isAttached}
						>
							Detach
						</button>
						<button
							className="flex-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							onClick={() => updateAttached(true)}
							disabled={isAttached}
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
