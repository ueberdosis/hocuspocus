import { writeVarString, writeVarUint } from "lib0/encoding";
import type { OutgoingMessageArguments } from "../types.ts";
import { MessageType } from "../types.ts";
import { OutgoingMessage } from "../OutgoingMessage.ts";

export class TokenSyncMessage extends OutgoingMessage {
	type = MessageType.TokenSync;

	description = "Token Sync";

	get(args: Partial<OutgoingMessageArguments>) {
		if (typeof args.token === "undefined") {
			throw new Error("The token sync message requires `token` as an argument.");
		}

		if (!args.documentName) {
			throw new Error("documentName is required for token sync message");
		}

		writeVarString(this.encoder, args.documentName);
		writeVarUint(this.encoder, this.type);
    writeVarString(this.encoder, args.token);

		return this.encoder;
	}
}

