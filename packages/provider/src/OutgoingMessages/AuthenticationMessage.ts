import { writeVarString, writeVarUint } from "lib0/encoding";
import { writeAuthentication } from "@hocuspocus/common";
import type { OutgoingMessageArguments } from "../types.ts";
import { MessageType } from "../types.ts";
import { OutgoingMessage } from "../OutgoingMessage.ts";

export class AuthenticationMessage extends OutgoingMessage {
	type = MessageType.Auth;

	description = "Authentication";

	get(args: Partial<OutgoingMessageArguments>) {
		if (typeof args.token === "undefined") {
			throw new Error(
				"The authentication message requires `token` as an argument.",
			);
		}

		writeVarString(this.encoder, args.documentName!);
		writeVarUint(this.encoder, this.type);
		writeAuthentication(this.encoder, args.token);

		return this.encoder;
	}
}
