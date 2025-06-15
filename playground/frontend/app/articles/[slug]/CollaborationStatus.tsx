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

	useEffect(() => {
		setSocketStatus(provider.configuration.websocketProvider.status);

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

	return (
		<div className="my-10">
			<p>
				Socket status: {socketStatus}/ Provider status:{" "}
				{provider.isAttached ? "attached" : "detached"}
			</p>

			<p>Unsynced changes: {unsyncedChanges}</p>

			<div className="flex flex-row gap-5 mt-3">
				<div>
					<p className="text-center">Socket</p>
					<div className="flex flex-row gap-2">
						<button
							className="border p-2"
							onClick={() =>
								provider.configuration.websocketProvider.disconnect()
							}
						>
							Disconnect
						</button>
						<button
							className="border p-2"
							onClick={() => provider.configuration.websocketProvider.connect()}
						>
							Connect
						</button>
					</div>
				</div>

				<div>
					<p className="text-center">Provider</p>
					<div className="flex flex-row gap-2">
						<button className="border p-2" onClick={() => provider.detach()}>
							Detach
						</button>
						<button className="border p-2" onClick={() => provider.attach()}>
							Attach
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default CollaborationStatus;
