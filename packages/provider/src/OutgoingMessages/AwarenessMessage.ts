import * as encoding from "lib0/encoding";
import { encodeAwarenessUpdate } from "y-protocols/awareness";
import type { OutgoingMessageArguments } from "../types.ts";
import { MessageType } from "../types.ts";
import { OutgoingMessage } from "../OutgoingMessage.ts";

export class AwarenessMessage extends OutgoingMessage {
	type = MessageType.Awareness;

	description = "Awareness states update";

	get(args: Partial<OutgoingMessageArguments>) {
		if (typeof args.awareness === "undefined") {
			throw new Error(
				"The awareness message requires awareness as an argument",
			);
		}

		if (typeof args.clients === "undefined") {
			throw new Error("The awareness message requires clients as an argument");
		}

		encoding.writeVarString(this.encoder, args.documentName!);
		encoding.writeVarUint(this.encoder, this.type);

		let awarenessUpdate;
		if (args.states === undefined) {
			awarenessUpdate = encodeAwarenessUpdate(args.awareness, args.clients);
		} else {
			awarenessUpdate = encodeAwarenessUpdate(
				args.awareness,
				args.clients,
				args.states,
			);
		}

		encoding.writeVarUint8Array(this.encoder, awarenessUpdate);

		return this.encoder;
	}
}
