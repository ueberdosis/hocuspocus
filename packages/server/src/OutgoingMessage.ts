import type { Encoder } from "lib0/encoding";
import {
	createEncoder,
	toUint8Array,
	writeVarString,
	writeVarUint,
	writeVarUint8Array,
} from "lib0/encoding";
import type { Awareness } from "y-protocols/awareness";
import { encodeAwarenessUpdate } from "y-protocols/awareness";
import { writeSyncStep1, writeUpdate } from "y-protocols/sync";

import { writeAuthenticated, writePermissionDenied } from "@hocuspocus/common";
import type Document from "./Document.ts";
import { MessageType } from "./types.ts";

export class OutgoingMessage {
	encoder: Encoder;

	type?: number;

	category?: string;

	constructor(documentName: string) {
		this.encoder = createEncoder();

		writeVarString(this.encoder, documentName);
	}

	createSyncMessage(): OutgoingMessage {
		this.type = MessageType.Sync;

		writeVarUint(this.encoder, MessageType.Sync);

		return this;
	}

	createSyncReplyMessage(): OutgoingMessage {
		this.type = MessageType.SyncReply;

		writeVarUint(this.encoder, MessageType.SyncReply);

		return this;
	}

	createAwarenessUpdateMessage(
		awareness: Awareness,
		changedClients?: Array<any>,
	): OutgoingMessage {
		this.type = MessageType.Awareness;
		this.category = "Update";

		const message = encodeAwarenessUpdate(
			awareness,
			changedClients || Array.from(awareness.getStates().keys()),
		);

		writeVarUint(this.encoder, MessageType.Awareness);
		writeVarUint8Array(this.encoder, message);

		return this;
	}

	writeQueryAwareness(): OutgoingMessage {
		this.type = MessageType.QueryAwareness;
		this.category = "Update";

		writeVarUint(this.encoder, MessageType.QueryAwareness);

		return this;
	}

	writeAuthenticated(readonly: boolean): OutgoingMessage {
		this.type = MessageType.Auth;
		this.category = "Authenticated";

		writeVarUint(this.encoder, MessageType.Auth);
		writeAuthenticated(this.encoder, readonly ? "readonly" : "read-write");

		return this;
	}

	writePermissionDenied(reason: string): OutgoingMessage {
		this.type = MessageType.Auth;
		this.category = "PermissionDenied";

		writeVarUint(this.encoder, MessageType.Auth);
		writePermissionDenied(this.encoder, reason);

		return this;
	}

	writeFirstSyncStepFor(document: Document): OutgoingMessage {
		this.category = "SyncStep1";

		writeSyncStep1(this.encoder, document);

		return this;
	}

	writeUpdate(update: Uint8Array): OutgoingMessage {
		this.category = "Update";

		writeUpdate(this.encoder, update);

		return this;
	}

	writeStateless(payload: string): OutgoingMessage {
		this.category = "Stateless";

		writeVarUint(this.encoder, MessageType.Stateless);
		writeVarString(this.encoder, payload);

		return this;
	}

	writeBroadcastStateless(payload: string): OutgoingMessage {
		this.category = "Stateless";

		writeVarUint(this.encoder, MessageType.BroadcastStateless);
		writeVarString(this.encoder, payload);

		return this;
	}

	// TODO: should this be write* or create* as method name?
	writeSyncStatus(updateSaved: boolean): OutgoingMessage {
		this.category = "SyncStatus";

		writeVarUint(this.encoder, MessageType.SyncStatus);
		writeVarUint(this.encoder, updateSaved ? 1 : 0);

		return this;
	}

	writeCloseMessage(reason: string): OutgoingMessage {
		this.type = MessageType.CLOSE;

		writeVarUint(this.encoder, MessageType.CLOSE);
		writeVarString(this.encoder, reason);

		return this;
	}

	toUint8Array(): Uint8Array {
		return toUint8Array(this.encoder);
	}
}
