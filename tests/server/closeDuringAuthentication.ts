import { WsReadyStates, writeAuthentication } from "@hocuspocus/common";
import test from "ava";
import * as encoding from "lib0/encoding";
import { newHocuspocus, sleep } from "../utils/index.ts";

const buildAuthFrame = (documentName: string, token: string): Uint8Array => {
	const encoder = encoding.createEncoder();
	encoding.writeVarString(encoder, documentName);
	encoding.writeVarUint(encoder, 2); // MessageType.Auth
	writeAuthentication(encoder, token);
	return encoding.toUint8Array(encoder);
};

// The real socket is gone by the time onAuthenticate resolves, so what the
// server still tries to send can only be observed on a stand-in.
const fakeWebSocket = () => {
	const websocket = {
		readyState: WsReadyStates.Open as number,
		sent: [] as Uint8Array[],
		send(message: Uint8Array) {
			websocket.sent.push(message);
		},
		close() {
			websocket.readyState = WsReadyStates.Closed;
		},
	};

	return websocket;
};

for (const [hook, outcome] of [
	["onConnect", "resolves"],
	["onConnect", "rejects"],
	["onAuthenticate", "resolves"],
	["onAuthenticate", "rejects"],
] as const) {
	test(`ignores a connection that closed while ${hook} was running and then ${outcome}`, async (t) => {
		let hookStarted!: () => void;
		const started = new Promise<void>((resolve) => {
			hookStarted = resolve;
		});

		let finishHook!: () => void;
		const finished = new Promise<void>((resolve) => {
			finishHook = resolve;
		});

		const server = await newHocuspocus(t, {
			async [hook]() {
				hookStarted();
				await finished;

				if (outcome === "rejects") {
					throw new Error("rejected after the connection closed");
				}
			},
			async onLoadDocument() {
				t.fail("must not load a document for a closed connection");
			},
			async connected() {
				t.fail("must not establish a closed connection");
			},
		});

		const websocket = fakeWebSocket();
		const connection = server.handleConnection(
			websocket as any,
			{ url: "/", headers: {} } as any,
		);

		connection.handleMessage(buildAuthFrame("closed-during-auth", "token"));
		await started;

		websocket.close();
		connection.handleClose();
		finishHook();
		await sleep(50);

		t.deepEqual(websocket.sent, []);
		t.is(server.getDocumentsCount(), 0);
	});
}
