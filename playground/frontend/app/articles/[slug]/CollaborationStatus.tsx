import type {HocuspocusProvider, onUnsyncedChangesParameters} from "@hocuspocus/provider";
import {useState} from "react";

const CollaborationStatus = (props: {
	provider: HocuspocusProvider;
}) => {
  const { provider } = props;

  const [unsyncedChanges, setUnsyncedChanges] = useState(0);

  provider.on('unsyncedChanges', (changes: onUnsyncedChangesParameters) => setUnsyncedChanges(changes.number))

	return <div className="my-10">
    <p>Socket status: {provider.configuration.websocketProvider.status}
      / Provider status: {provider.isAttached ? 'attached' : 'detached'}
    </p>

    <p>Unsynced changes: {unsyncedChanges}</p>

    <div className="flex flex-row gap-5 mt-3">
      <div>
        <p className="text-center">Socket</p>
        <div className="flex flex-row gap-2">
          <button className="border p-2" onClick={() => provider.configuration.websocketProvider.disconnect()}>Disconnect</button>
          <button className="border p-2" onClick={() => provider.configuration.websocketProvider.connect()}>Connect</button>
        </div>
      </div>

      <div>
        <p className="text-center">Provider</p>
        <div className="flex flex-row gap-2">
          <button className="border p-2" onClick={() => provider.detach()}>Detach</button>
          <button className="border p-2" onClick={() => provider.attach()}>Attach</button>
        </div>
      </div>
    </div>
  </div>
};

export default CollaborationStatus;
