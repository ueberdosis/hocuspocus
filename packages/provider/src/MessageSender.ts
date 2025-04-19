import type { Encoder } from "lib0/encoding";
import { toUint8Array } from "lib0/encoding";
import type { ConstructableOutgoingMessage } from "./types.ts";

export class MessageSender {
	encoder: Encoder;

	message: any;

	constructor(Message: ConstructableOutgoingMessage, args: any = {}) {
		this.message = new Message();
		this.encoder = this.message.get(args);
	}

	create() {
		return toUint8Array(this.encoder);
	}

	send(webSocket: any) {
		webSocket?.send(this.create());
	}
}
