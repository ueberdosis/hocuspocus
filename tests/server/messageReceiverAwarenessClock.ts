import test from "ava";
import sinon from "sinon";

test("accepts a clock-1 awareness update that reuses the scratch client ID", async (t) => {
	const clientID = 42;
	const getRandomValues = <T extends ArrayBufferView | null>(array: T): T => {
		if (!(array instanceof Uint32Array)) {
			throw new TypeError("expected a Uint32Array");
		}
		array.fill(clientID);
		return array;
	};
	const randomStub = sinon
		.stub(globalThis.crypto, "getRandomValues")
		.callsFake(getRandomValues);

	try {
		const [Y, awarenessProtocol, encoding, incomingModule, receiverModule, types] =
			await Promise.all([
				import("yjs"),
				import(
					"../../packages/server/node_modules/y-protocols/awareness.js"
				),
				import("lib0/encoding"),
				import("../../packages/server/src/IncomingMessage.ts"),
				import("../../packages/server/src/MessageReceiver.ts"),
				import("../../packages/server/src/types.ts"),
			]);

		const senderDoc = new Y.Doc();
		const sender = new awarenessProtocol.Awareness(senderDoc);
		sender.setLocalState({ edge: true });

		const encoder = encoding.createEncoder();
		encoding.writeVarUint(encoder, types.MessageType.Awareness);
		encoding.writeVarUint8Array(
			encoder,
			awarenessProtocol.encodeAwarenessUpdate(sender, [clientID]),
		);

		const targetDoc = new Y.Doc();
		const target = new awarenessProtocol.Awareness(targetDoc);
		let hookState: Record<string, unknown> | undefined;
		const document = {
			awareness: target,
			callbacks: {
				beforeHandleAwareness: async (
					_document: unknown,
					states: Map<number, Record<string, unknown>>,
				) => {
					hookState = states.get(clientID);
				},
			},
		};

		const message = new incomingModule.IncomingMessage(
			encoding.toUint8Array(encoder),
		);
		await new receiverModule.MessageReceiver(message).apply(document as never);

		t.deepEqual(hookState, { edge: true });
		t.deepEqual(target.getStates().get(clientID), { edge: true });

		sender.destroy();
		senderDoc.destroy();
		target.destroy();
		targetDoc.destroy();
	} finally {
		randomStub.restore();
	}
});
