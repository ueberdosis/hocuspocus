import type { Connection, Document as DocumentType } from "@hocuspocus/server";
import test from "ava";
import sinon from "sinon";

// lib0 binds getRandomValues on import, so the spy has to come first. Each
// scratch Y.Doc draws its guid and clientID from it.
const getRandomValues = sinon.spy(globalThis.crypto, "getRandomValues");

const [encoding, { Document, IncomingMessage, MessageReceiver, MessageType }] =
	await Promise.all([import("lib0/encoding"), import("@hocuspocus/server")]);

type Entry = [clientId: number, clock: number, state: unknown];

// States that make an update malformed: an entry that is not JSON, or one that
// is counted in the update's length but not sent.
const notJson = Symbol("not JSON");
const notSent = Symbol("not sent");

// A state sent as this JSON text, for numbers JSON.stringify can't write.
class Json {
	constructor(readonly text: string) {}
}

const awarenessUpdate = (entries: Entry[]) => {
	const update = encoding.createEncoder();
	encoding.writeVarUint(update, entries.length);
	for (const [clientId, clock, state] of entries) {
		if (state === notSent) continue;
		encoding.writeVarUint(update, clientId);
		encoding.writeVarUint(update, clock);
		encoding.writeVarString(
			update,
			state === notJson
				? "{"
				: state instanceof Json
					? state.text
					: JSON.stringify(state),
		);
	}

	return encoding.toUint8Array(update);
};

const awarenessMessage = (entries: Entry[]) => {
	const message = encoding.createEncoder();
	encoding.writeVarUint(message, MessageType.Awareness);
	encoding.writeVarUint8Array(message, awarenessUpdate(entries));

	return new IncomingMessage(encoding.toUint8Array(message));
};

const apply = (
	document: DocumentType,
	entries: Entry[],
	connection?: Connection,
) => new MessageReceiver(awarenessMessage(entries)).apply(document, connection);

const addConnection = (document: DocumentType) => {
	const connection = { messageAddress: document.name, send: () => {} };
	document.connections.set(connection as never, { clients: new Set() });

	return connection as never as Connection;
};

// Without a hook the fast path runs, with one the scratch Awareness.
const newDocument = (hook: boolean) => {
	const document = new Document("hocuspocus-test");
	if (hook) document.beforeHandleAwareness(async () => {});

	return document;
};

// Serial, so the other tests' documents don't draw random values meanwhile.
test.serial(
	"applies an update without a scratch Y.Doc while no hook is active",
	async (t) => {
		const bare = new Document("hocuspocus-test");
		const inactive = new Document("hocuspocus-test");
		const origin = { source: "local" as const };
		const appliedWith: unknown[] = [];
		for (const document of [bare, inactive]) {
			document.awareness.on("update", (_: unknown, updateOrigin: unknown) => {
				appliedWith.push(updateOrigin);
			});
		}
		inactive.beforeHandleAwareness(
			async () => t.fail("the callback is not called"),
			() => false,
		);
		const cursor = { anchor: { type: 1, item: 7 }, head: { type: 1, item: 9 } };
		// One client; a clock past one varint byte; two clients, as Redis relays them.
		const updates: Entry[][] = [
			[[1, 1, { user: "a" }]],
			[[1, 300, { user: "a", cursor }]],
			[
				[2, 1, { user: "b" }],
				[3, 1, { user: "c" }],
			],
		];

		const randomCalls = getRandomValues.callCount;
		for (const document of [bare, inactive]) {
			for (const entries of updates) {
				await new MessageReceiver(awarenessMessage(entries), origin).apply(
					document,
				);
			}
		}

		t.is(getRandomValues.callCount, randomCalls, "no scratch Y.Doc");
		for (const document of [bare, inactive]) {
			t.deepEqual(document.awareness.getStates().get(1), { user: "a", cursor });
			t.deepEqual(document.awareness.getStates().get(3), { user: "c" });
		}
		t.is(appliedWith.length, 6);
		t.true(appliedWith.every((updateOrigin) => updateOrigin === origin));
		bare.destroy();
		inactive.destroy();
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

test("a callback assigned to document.callbacks directly runs", async (t) => {
	const document = new Document("hocuspocus-test");
	let calls = 0;
	document.callbacks.beforeHandleAwareness = async () => {
		calls += 1;
	};

	await apply(document, [[1, 1, { user: "a" }]]);

	t.is(calls, 1);
	t.deepEqual(document.awareness.getStates().get(1), { user: "a" });
	document.destroy();
});

test("a callback assigned over a registered one runs, whatever its predicate", async (t) => {
	const document = new Document("hocuspocus-test");
	// As Hocuspocus registers its hook chain: active only while an extension has the hook.
	document.beforeHandleAwareness(
		async () => t.fail("the replaced callback is not called"),
		() => false,
	);
	let calls = 0;
	document.callbacks.beforeHandleAwareness = async () => {
		calls += 1;
	};

	await apply(document, [[1, 1, { user: "a" }]]);

	t.is(calls, 1);
	document.destroy();
});

test("an inactive callback is skipped also when a client is named twice", async (t) => {
	const document = new Document("hocuspocus-test");
	document.beforeHandleAwareness(
		async () => t.fail("the callback is not called"),
		() => false,
	);

	await apply(document, [
		[1, 1, null],
		[1, 2, { user: "a" }],
	]);

	t.deepEqual(document.awareness.getStates().get(1), { user: "a" });
	document.destroy();
});

test("a malformed update leaves the awareness untouched", async (t) => {
	for (const entries of [
		[
			[1, 1, { user: "a" }],
			[2, 1, notSent],
		],
		[
			[1, 1, { user: "a" }],
			[2, 1, notJson],
		],
	] satisfies Entry[][]) {
		const document = new Document("hocuspocus-test");

		await t.throwsAsync(apply(document, entries));

		t.false(document.awareness.getStates().has(1));
		t.false(document.awareness.meta.has(1));
		document.destroy();
	}
});

// Everything a sequence of updates leaves behind, apart from the document's own client.
const outcome = async (hook: boolean, updates: Entry[][]) => {
	const document = newDocument(hook);
	const connection = addConnection(document);
	const { awareness } = document;
	const clients = () =>
		[...awareness.meta]
			.filter(([clientId]) => clientId !== awareness.clientID)
			.map(([clientId, { clock }]) => [
				clientId,
				clock,
				awareness.getStates().get(clientId) ?? null,
			]);
	const events: unknown[] = [];
	const errors: string[] = [];
	const onUpdate = (change: unknown) => events.push(change);
	awareness.on("update", onUpdate);

	for (const entries of updates) {
		await apply(document, entries, connection).catch((error: Error) =>
			errors.push(error.message),
		);
	}

	const tracked = [...document.getClients(connection)];
	const before = clients();
	document.removeConnection(connection);
	const afterDisconnect = clients();
	// Destroying the document removes its own client, which differs per document.
	awareness.off("update", onUpdate);
	document.destroy();

	return { clients: before, events, errors, tracked, afterDisconnect };
};

const sequences: Record<string, Entry[][]> = {
	"a state, a change and a removal": [
		[[1, 1, { user: "a" }]],
		[[1, 2, { user: "a", cursor: 1 }]],
		[[1, 3, null]],
	],
	"several clients in one update": [
		[
			[1, 1, { user: "a" }],
			[2, 1, { user: "b" }],
			[3, 4, null],
		],
	],
	"falsy states": [
		[
			[1, 1, { user: "a" }],
			[2, 1, { user: "b" }],
			[3, 1, { user: "c" }],
		],
		[
			[1, 2, false],
			[2, 2, 0],
			[3, 2, ""],
		],
	],
	"numbers JSON can't round-trip": [
		[
			[1, 1, { user: "a" }],
			[2, 1, { user: "b" }],
		],
		[
			[1, 2, new Json("1e400")],
			[2, 2, new Json("-0")],
			[3, 1, new Json("[1e400, -0]")],
		],
	],
	"states that are not objects": [
		[
			[1, 1, true],
			[2, 1, 5],
			[3, 1, "a"],
			[4, 1, [1]],
		],
	],
	"a stale clock": [[[1, 5, { user: "a" }]], [[1, 3, { user: "b" }]]],
	"a removal at the same clock": [[[1, 4, { user: "a" }]], [[1, 4, null]]],
	"one client twice in one update": [
		[
			[1, 1, null],
			[1, 2, { user: "a" }],
		],
		[
			[1, 3, null],
			[1, 4, { user: "b" }],
		],
	],
	"one client twice at one clock": [
		[
			[1, 2, { user: "a" }],
			[1, 2, false],
		],
	],
	"an entry that is not JSON": [
		[
			[1, 1, { user: "a" }],
			[2, 1, notJson],
		],
	],
	"an entry that is not sent": [
		[
			[1, 1, { user: "a" }],
			[2, 1, notSent],
		],
	],
	"an entry that is not JSON, then one not sent": [
		[
			[1, 1, { user: "a" }],
			[2, 1, notJson],
			[3, 1, notSent],
		],
	],
};

test("without a hook, updates end as they do through a scratch Awareness", async (t) => {
	for (const [name, updates] of Object.entries(sequences)) {
		t.deepEqual(
			await outcome(false, updates),
			await outcome(true, updates),
			name,
		);
	}
});

test("a client that comes back on a new connection leaves with it", async (t) => {
	for (const hook of [false, true]) {
		const document = newDocument(hook);
		const first = addConnection(document);
		await apply(document, [[1, 1, { user: "a" }]], first);
		document.removeConnection(first);

		const second = addConnection(document);
		await apply(document, [[1, 2, { user: "a" }]], second);
		document.removeConnection(second);

		t.false(document.awareness.getStates().has(1), `hook: ${hook}`);
		document.destroy();
	}
});

test("a new connection takes a client over from one that is still open", async (t) => {
	for (const hook of [false, true]) {
		const document = newDocument(hook);
		const stale = addConnection(document);
		const current = addConnection(document);
		await apply(document, [[1, 1, { user: "a" }]], stale);
		await apply(document, [[1, 2, { user: "a" }]], current);

		t.false(document.getClients(stale).has(1), `released, hook: ${hook}`);
		document.removeConnection(stale);
		t.true(document.awareness.getStates().has(1), `stays, hook: ${hook}`);

		document.removeConnection(current);
		t.false(document.awareness.getStates().has(1), `leaves, hook: ${hook}`);
		document.destroy();
	}
});

test("a state another connection sends at the same clock does not take the client", async (t) => {
	for (const hook of [false, true]) {
		const document = newDocument(hook);
		const owner = addConnection(document);
		const other = addConnection(document);
		await apply(document, [[1, 1, { user: "a" }]], owner);

		// Provider 3.x sends every state it receives back with its clock.
		await apply(document, [[1, 1, { user: "a" }]], other);
		t.true(document.getClients(owner).has(1), `hook: ${hook}`);
		t.false(document.getClients(other).has(1), `hook: ${hook}`);

		document.removeConnection(owner);
		t.false(document.awareness.getStates().has(1), `hook: ${hook}`);
		document.destroy();
	}
});

test("a removal from another connection releases the client", async (t) => {
	for (const hook of [false, true]) {
		const document = newDocument(hook);
		const owner = addConnection(document);
		const other = addConnection(document);
		await apply(document, [[1, 1, { user: "a" }]], owner);
		await apply(document, [[1, 2, null]], other);

		t.false(document.getClients(owner).has(1), `hook: ${hook}`);
		t.false(document.getClients(other).has(1), `hook: ${hook}`);
		document.destroy();
	}
});

test("a state from another instance releases the client", async (t) => {
	for (const hook of [false, true]) {
		const document = newDocument(hook);
		const connection = addConnection(document);
		await apply(document, [[1, 1, { user: "a" }]], connection);

		// The client moved to another instance, which relays its newer state.
		await new MessageReceiver(awarenessMessage([[1, 2, { user: "a" }]]), {
			source: "redis",
		}).apply(document);
		t.false(document.getClients(connection).has(1), `hook: ${hook}`);

		document.removeConnection(connection);
		t.deepEqual(document.awareness.getStates().get(1), { user: "a" });
		document.destroy();
	}
});

test("a client released by another instance's state is taken back by its connection's next state", async (t) => {
	for (const hook of [false, true]) {
		const document = newDocument(hook);
		const connection = addConnection(document);
		await apply(document, [[1, 1, { user: "a" }]], connection);
		await new MessageReceiver(awarenessMessage([[1, 2, { user: "a" }]]), {
			source: "redis",
		}).apply(document);
		await apply(document, [[1, 3, { user: "a" }]], connection);
		t.true(document.getClients(connection).has(1), `hook: ${hook}`);

		document.removeConnection(connection);
		t.false(document.awareness.getStates().has(1), `hook: ${hook}`);
		document.destroy();
	}
});

test("a state set by server code leaves the client with its connection", async (t) => {
	for (const hook of [false, true]) {
		const document = newDocument(hook);
		const connection = addConnection(document);
		await apply(document, [[1, 1, { user: "a" }]], connection);

		// Server code rewrites the client's state with a newer clock.
		await new MessageReceiver(
			awarenessMessage([[1, 2, { user: "a", verified: true }]]),
			{ source: "local" },
		).apply(document);
		t.true(document.getClients(connection).has(1), `hook: ${hook}`);

		document.removeConnection(connection);
		t.false(document.awareness.getStates().has(1), `hook: ${hook}`);
		document.destroy();
	}
});

test("of an update from a closed connection only the removals apply", async (t) => {
	for (const hook of [false, true]) {
		const document = newDocument(hook);
		const owner = addConnection(document);
		const closed = addConnection(document);
		await apply(
			document,
			[
				[1, 1, { user: "a" }],
				[3, 1, { user: "c" }],
				[4, 1, { user: "d" }],
			],
			owner,
		);
		document.removeConnection(closed);
		await apply(
			document,
			[
				[1, 2, null],
				[2, 1, { user: "b" }],
				[3, 2, 0],
				[4, 2, new Json("1e400")],
			],
			closed,
		);

		const states = document.awareness.getStates();
		t.false(states.has(1), `a removal, hook: ${hook}`);
		t.false(states.has(3), `a falsy state, hook: ${hook}`);
		t.false(states.has(4), `a state that re-encodes to null, hook: ${hook}`);
		t.false(states.has(2), `a state, hook: ${hook}`);
		t.deepEqual([...document.getClients(owner)], [], `hook: ${hook}`);
		document.destroy();
	}
});

test("of an update whose connection closes while a hook awaits only the removals apply", async (t) => {
	const document = new Document("hocuspocus-test");
	let resume = () => {};
	document.beforeHandleAwareness(
		() =>
			new Promise<void>((r) => {
				resume = r;
			}),
	);
	const owner = addConnection(document);
	const owned = apply(document, [[1, 1, { user: "a" }]], owner);
	resume();
	await owned;

	const closing = addConnection(document);
	const state = apply(document, [[1, 2, { user: "b" }]], closing);
	document.removeConnection(closing);
	resume();
	await state;
	t.deepEqual(document.awareness.getStates().get(1), { user: "a" });
	t.true(document.getClients(owner).has(1));

	const alsoClosing = addConnection(document);
	const removal = apply(document, [[1, 3, null]], alsoClosing);
	document.removeConnection(alsoClosing);
	resume();
	await removal;
	t.false(document.awareness.getStates().has(1));
	document.destroy();
});

test("a state applied for a closed connection leaves the client with its owner", async (t) => {
	const document = new Document("hocuspocus-test");
	const owner = addConnection(document);
	const closed = addConnection(document);
	await apply(document, [[1, 1, { user: "a" }]], owner);
	document.removeConnection(closed);

	// Document.applyAwarenessUpdate skips MessageReceiver and applies it anyway.
	document.applyAwarenessUpdate(
		closed,
		awarenessUpdate([[1, 2, { user: "b" }]]),
	);
	t.true(document.getClients(owner).has(1));

	document.removeConnection(owner);
	t.false(document.awareness.getStates().has(1));
	document.destroy();
});

test("a client that clears its state and sets it again leaves with its connection", async (t) => {
	const sequences: Record<string, Entry[][]> = {
		"separate updates": [
			[[1, 1, { user: "a" }]],
			[[1, 2, null]],
			[[1, 3, { user: "b" }]],
		],
		"named twice in one update": [
			[
				[1, 1, null],
				[1, 2, { user: "a" }],
			],
			[
				[1, 3, null],
				[1, 4, { user: "b" }],
			],
		],
	};

	for (const hook of [false, true]) {
		for (const [name, updates] of Object.entries(sequences)) {
			const document = newDocument(hook);
			const connection = addConnection(document);
			for (const entries of updates) {
				await apply(document, entries, connection);
			}
			t.deepEqual(document.awareness.getStates().get(1), { user: "b" });

			document.removeConnection(connection);

			t.false(document.awareness.getStates().has(1), `${name}, hook: ${hook}`);
			document.destroy();
		}
	}
});

test("the document's own client never belongs to a connection", async (t) => {
	for (const hook of [false, true]) {
		const document = newDocument(hook);
		const connection = addConnection(document);
		const own = document.awareness.clientID;
		const clock = document.awareness.meta.get(own)?.clock ?? 0;

		await apply(document, [[own, clock + 1, { user: "a" }]], connection);
		document.applyAwarenessUpdate(
			connection,
			awarenessUpdate([
				[own, clock + 2, null],
				[own, clock + 3, { user: "b" }],
			]),
		);

		t.false(document.getClients(connection).has(own), `hook: ${hook}`);
		document.destroy();
	}
});

test("a connection that removes the document's own state does not take it over", async (t) => {
	for (const hook of [false, true]) {
		const document = newDocument(hook);
		const connection = addConnection(document);
		const own = document.awareness.clientID;
		document.awareness.setLocalState({ user: "server" });
		const clock = document.awareness.meta.get(own)?.clock ?? 0;

		await apply(document, [[own, clock + 1, null]], connection);
		document.removeConnection(connection);

		t.deepEqual(
			document.awareness.getStates().get(own),
			{ user: "server" },
			`hook: ${hook}`,
		);
		document.destroy();
	}
});

test("a client named twice in an update a connection applies directly belongs to it", async (t) => {
	const document = new Document("hocuspocus-test");
	const owner = addConnection(document);
	const other = addConnection(document);
	await apply(document, [[1, 1, { user: "a" }]], owner);

	// Document.applyAwarenessUpdate skips MessageReceiver and its duplicate check.
	document.applyAwarenessUpdate(
		other,
		awarenessUpdate([
			[1, 2, null],
			[1, 3, { user: "b" }],
		]),
	);
	document.removeConnection(owner);
	t.deepEqual(document.awareness.getStates().get(1), { user: "b" });

	document.removeConnection(other);
	t.false(document.awareness.getStates().has(1));
	document.destroy();
});

test("a state set while the owner's connection closes stays with the new owner", async (t) => {
	const document = new Document("hocuspocus-test");
	const closing = addConnection(document);
	const next = addConnection(document);
	const third = addConnection(document);
	await apply(document, [[1, 1, { user: "a" }]], closing);

	// A listener that answers the removal with a newer state from another connection.
	let answered = false;
	document.awareness.on("update", ({ removed }: { removed: number[] }) => {
		if (!answered && removed.includes(1)) {
			answered = true;
			document.applyAwarenessUpdate(
				next,
				awarenessUpdate([[1, 2, { user: "a" }]]),
			);
		}
	});
	document.removeConnection(closing);
	t.true(document.getClients(next).has(1));

	// Only the new owner can lose the client to a third connection.
	await apply(document, [[1, 3, { user: "a" }]], third);
	document.removeConnection(next);
	t.true(document.awareness.getStates().has(1));

	document.removeConnection(third);
	t.false(document.awareness.getStates().has(1));
	document.destroy();
});
