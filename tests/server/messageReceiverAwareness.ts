import type { Connection, Document as DocumentType } from "@hocuspocus/server";
import test from "ava";
import sinon from "sinon";

// lib0 binds getRandomValues on import, so the spy has to come first. Each
// scratch Y.Doc draws its guid and clientID from it.
const getRandomValues = sinon.spy(globalThis.crypto, "getRandomValues");

const [encoding, { Document, IncomingMessage, MessageReceiver, MessageType }] =
	await Promise.all([import("lib0/encoding"), import("@hocuspocus/server")]);

type Entry = [clientId: number, clock: number, state: unknown];

const awarenessMessage = (
	entries: Entry[],
	declaredLength = entries.length,
) => {
	const update = encoding.createEncoder();
	encoding.writeVarUint(update, declaredLength);
	for (const [clientId, clock, state] of entries) {
		encoding.writeVarUint(update, clientId);
		encoding.writeVarUint(update, clock);
		encoding.writeVarString(update, JSON.stringify(state));
	}

	const message = encoding.createEncoder();
	encoding.writeVarUint(message, MessageType.Awareness);
	encoding.writeVarUint8Array(message, encoding.toUint8Array(update));

	return new IncomingMessage(encoding.toUint8Array(message));
};

const apply = (
	document: DocumentType,
	entries: Entry[],
	connection?: Connection,
	declaredLength?: number,
) =>
	new MessageReceiver(awarenessMessage(entries, declaredLength)).apply(
		document,
		connection,
	);

const addConnection = (document: DocumentType) => {
	const connection = { messageAddress: document.name, send: () => {} };
	document.connections.set(connection as never, { clients: new Set() });

	return connection as never as Connection;
};

// Serial, so the other tests' documents don't draw random values meanwhile.
test.serial(
	"applies a plain update without a scratch Y.Doc while no hook is active",
	async (t) => {
		const document = new Document("hocuspocus-test");
		const origin = { source: "local" as const };
		let appliedWith: unknown;
		document.awareness.on("update", (_: unknown, updateOrigin: unknown) => {
			appliedWith = updateOrigin;
		});
		document.beforeHandleAwareness(
			async () => t.fail("the callback is not called"),
			() => false,
		);

		const randomCalls = getRandomValues.callCount;
		await new MessageReceiver(
			awarenessMessage([[1, 1, { user: "a" }]]),
			origin,
		).apply(document);

		t.is(getRandomValues.callCount, randomCalls, "no scratch Y.Doc");
		t.deepEqual(document.awareness.getStates().get(1), { user: "a" });
		t.is(appliedWith, origin);
		document.destroy();
	},
);

test("a callback registered without isActive still runs", async (t) => {
	const document = new Document("hocuspocus-test");
	let calls = 0;
	document.beforeHandleAwareness(async () => {
		calls += 1;
	});

	await apply(document, [[1, 1, { user: "a" }]]);

	t.is(calls, 1);
	t.deepEqual(document.awareness.getStates().get(1), { user: "a" });
	document.destroy();
});

test("a malformed update leaves the awareness untouched", async (t) => {
	const document = new Document("hocuspocus-test");

	// Two entries announced, one sent: the first decodes, the second does not.
	await t.throwsAsync(apply(document, [[1, 1, { user: "a" }]], undefined, 2));

	t.false(document.awareness.getStates().has(1));
	t.false(document.awareness.meta.has(1));
	document.destroy();
});

test("a client named twice in one update is still removed with its connection", async (t) => {
	const document = new Document("hocuspocus-test");
	const connection = addConnection(document);

	await apply(
		document,
		[
			[1, 1, null],
			[1, 2, { user: "a" }],
		],
		connection,
	);
	t.true(document.getClients(connection).has(1), "a new client is tracked");

	await apply(
		document,
		[
			[1, 3, null],
			[1, 4, { user: "b" }],
		],
		connection,
	);
	t.true(
		document.getClients(connection).has(1),
		"a known client stays tracked",
	);
	t.deepEqual(document.awareness.getStates().get(1), { user: "b" });

	document.removeConnection(connection);

	t.false(document.awareness.getStates().has(1));
	document.destroy();
});

test("a state that is not an object removes the client, as through a scratch Awareness", async (t) => {
	for (const state of [false, 0, ""]) {
		const document = new Document("hocuspocus-test");

		await apply(document, [[1, 1, { user: "a" }]]);
		await apply(document, [[1, 2, state]]);

		t.false(document.awareness.getStates().has(1), JSON.stringify(state));
		document.destroy();
	}
});
