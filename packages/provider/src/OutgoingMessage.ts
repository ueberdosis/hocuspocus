import type { Encoder } from "lib0/encoding";
import { createEncoder, toUint8Array } from "lib0/encoding";
import type {
	MessageType,
	OutgoingMessageArguments,
	OutgoingMessageInterface,
} from "./types.ts";

export class OutgoingMessage implements OutgoingMessageInterface {
	encoder: Encoder;

	type?: MessageType;

	constructor() {
		this.encoder = createEncoder();
	}

	get(args: Partial<OutgoingMessageArguments>) {
		return args.encoder;
	}

	toUint8Array() {
		return toUint8Array(this.encoder);
	}
}
