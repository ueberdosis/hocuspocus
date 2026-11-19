import test from "ava";
import sinon from "sinon";

test("decodes awareness updates without drawing random values, and a waiting hook keeps its own states", async (t) => {
	// lib0 binds the random source when it loads, so spy on it first.
	const random = sinon.spy(globalThis.crypto, "getRandomValues");

	try {
		const [encoding, incomingModule, receiverModule, types] = await Promise.all(
			[
				import("lib0/encoding"),
				import("../../packages/server/src/IncomingMessage.ts"),
				import("../../packages/server/src/MessageReceiver.ts"),
				import("../../packages/server/src/types.ts"),
			],
		);

		const message = (clientID: number, clock: number, state: unknown) => {
			const update = encoding.createEncoder();
			encoding.writeVarUint(update, 1);
			encoding.writeVarUint(update, clientID);
			encoding.writeVarUint(update, clock);
			encoding.writeVarString(update, JSON.stringify(state));
			const encoder = encoding.createEncoder();
			encoding.writeVarUint(encoder, types.MessageType.Awareness);
			encoding.writeVarUint8Array(encoder, encoding.toUint8Array(update));
			return new incomingModule.IncomingMessage(encoding.toUint8Array(encoder));
		};

		const targetStates = new Map<number, unknown>();
		const target = {
			clientID: 0,
			states: targetStates,
			meta: new Map(),
			getLocalState: () => null,
			emit: () => undefined,
		};

		let release = () => {};
		const held = new Promise<void>((resolve) => {
			release = resolve;
		});
		const handed: Map<number, unknown>[] = [];
		const document = {
			awareness: target,
			callbacks: {
				beforeHandleAwareness: async (
					_document: unknown,
					states: Map<number, unknown>,
				) => {
					handed.push(states);
					if (handed.length === 2) await held;
				},
			},
		};
		const apply = (clientID: number, clock: number, state: unknown) =>
			new receiverModule.MessageReceiver(message(clientID, clock, state)).apply(
				document as never,
			);

		// The first message may build the scratch the process keeps.
		await apply(1, 1, { n: 0 });
		// Building that scratch draws random values, so the spy sees the source.
		t.true(random.callCount > 0);
		random.resetHistory();

		const waiting = apply(1, 2, { n: 1 });
		await apply(2, 1, { n: 2 });
		release();
		await waiting;

		t.is(random.callCount, 0);
		t.deepEqual(
			handed.slice(1).map((states) => [...states]),
			[[[1, { n: 1 }]], [[2, { n: 2 }]]],
		);
		t.deepEqual(
			[...targetStates],
			[
				[1, { n: 1 }],
				[2, { n: 2 }],
			],
		);
	} finally {
		random.restore();
	}
});
