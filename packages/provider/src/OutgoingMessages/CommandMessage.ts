import { writeAny, writeVarString, writeVarUint } from "lib0/encoding";
import type { OutgoingMessageArguments } from "../types.ts";
import { MessageType } from "../types.ts";
import { OutgoingMessage } from "../OutgoingMessage.ts";

export class CommandMessage extends OutgoingMessage {
	type = MessageType.Command;

	description = "A command message";

	get(args: Partial<OutgoingMessageArguments>) {
		writeVarString(this.encoder, args.documentName!);
		writeVarUint(this.encoder, this.type);
		writeVarString(this.encoder, args.type ?? "");
		writeAny(this.encoder, args.payload ?? null);

		return this.encoder;
	}
}
