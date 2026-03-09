import * as encoding from "lib0/encoding";
import { writeSyncStep2 } from "@hocuspocus/common";
import type { OutgoingMessageArguments } from "../types.ts";
import { MessageType } from "../types.ts";
import { OutgoingMessage } from "../OutgoingMessage.ts";

export class SyncStepTwoMessage extends OutgoingMessage {
	type = MessageType.Sync;

	description = "Second sync step";

	get(args: Partial<OutgoingMessageArguments>) {
		if (typeof args.document === "undefined") {
			throw new Error(
				"The sync step two message requires document as an argument",
			);
		}

		encoding.writeVarString(this.encoder, args.documentName!);
		encoding.writeVarUint(this.encoder, this.type);
		writeSyncStep2(this.encoder, args.document, undefined, args.yjsEncodingVersion ?? 1);

		return this.encoder;
	}
}
