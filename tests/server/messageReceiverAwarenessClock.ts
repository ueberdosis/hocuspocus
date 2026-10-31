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
		const [encoding, incomingModule, receiverModule, types] =
			await Promise.all([
				import("lib0/encoding"),
				import("../../packages/server/src/IncomingMessage.ts"),
				import("../../packages/server/src/MessageReceiver.ts"),
				import("../../packages/server/src/types.ts"),
			]);

		const updateEncoder = encoding.createEncoder();
		encoding.writeVarUint(updateEncoder, 1);
		encoding.writeVarUint(updateEncoder, clientID);
		encoding.writeVarUint(updateEncoder, 1);
		encoding.writeVarString(updateEncoder, JSON.stringify({ edge: true }));

		const encoder = encoding.createEncoder();
		encoding.writeVarUint(encoder, types.MessageType.Awareness);
		encoding.writeVarUint8Array(
			encoder,
			encoding.toUint8Array(updateEncoder),
		);

		const targetStates = new Map<number, Record<string, unknown>>([
			[clientID, {}],
		]);
		const target = {
			clientID,
			states: targetStates,
			meta: new Map([[clientID, { clock: 0, lastUpdated: Date.now() }]]),
			getLocalState: () => targetStates.get(clientID) ?? null,
			emit: () => undefined,
		};
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
		t.deepEqual(targetStates.get(clientID), { edge: true });
	} finally {
		randomStub.restore();
	}
});
