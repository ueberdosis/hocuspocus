import test from "ava";
import { newHocuspocus, newHocuspocusProvider, sleep } from "../utils/index.ts";
import { retryableAssertion } from "../utils/retryableAssertion.ts";

test("without a beforeHandleAwareness hook, a state, its changes and the client leaving reach the other clients, also after a reconnect", async (t) => {
	const server = await newHocuspocus(t);

	const leaving = newHocuspocusProvider(t, server);
	const staying = newHocuspocusProvider(t, server);
	const leavingId = leaving.document.clientID;
	const leavingState = () => staying.awareness?.getStates().get(leavingId);
	const document = () => server.documents.get("hocuspocus-test");

	// The server removes the clients a connection set once it closes, which
	// only works if the updates were applied with the connection as origin.
	const leave = async () => {
		leaving.configuration.websocketProvider.disconnect();

		// Fail before the 30s silent-client timeout could mask a dropped removal.
		const deadline = Date.now() + 5000;
		while (
			Date.now() < deadline &&
			(leavingState() !== undefined ||
				document()?.awareness.getStates().has(leavingId))
		) {
			await sleep(50);
		}

		t.is(leavingState(), undefined);
		t.false(document()?.awareness.getStates().has(leavingId));
	};

	leaving.setAwarenessField("user", "leaving");

	await retryableAssertion(t, (tt) => {
		tt.is(leavingState()?.user, "leaving");
	});

	// A cursor move changes a state the server already holds.
	leaving.setAwarenessField("cursor", 1);

	await retryableAssertion(t, (tt) => {
		tt.deepEqual(leavingState(), { user: "leaving", cursor: 1 });
	});

	t.false(
		document()?.callbacks.isBeforeHandleAwarenessActive?.() ?? true,
		"no hook is configured",
	);
	t.is(
		typeof server.configuration.beforeHandleAwareness,
		"function",
		"the configuration keeps its default no-op",
	);

	await leave();

	// Back on a new connection, the server already knows the client.
	leaving.configuration.websocketProvider.connect();
	leaving.setAwarenessField("cursor", 2);

	await retryableAssertion(t, (tt) => {
		tt.deepEqual(leavingState(), { user: "leaving", cursor: 2 });
	});

	await leave();
});

test("a beforeHandleAwareness hook added after the document is loaded still runs", async (t) => {
	const server = await newHocuspocus(t);

	const sending = newHocuspocusProvider(t, server);
	const receiving = newHocuspocusProvider(t, server);
	const sentState = () =>
		receiving.awareness?.getStates().get(sending.document.clientID);

	sending.setAwarenessField("user", "Spoofed");

	await retryableAssertion(t, (tt) => {
		tt.is(sentState()?.user, "Spoofed");
	});

	const isActive = () =>
		server.documents
			.get("hocuspocus-test")
			?.callbacks.isBeforeHandleAwarenessActive?.();
	t.false(isActive());

	server.configuration.extensions.push({ extensionName: "without the hook" });
	t.false(isActive());

	server.configuration.extensions.push({
		async beforeHandleAwareness({ states }) {
			for (const state of states.values()) {
				state.user = "Verified";
			}
		},
	});
	t.true(isActive());

	sending.setAwarenessField("cursor", 1);

	await retryableAssertion(t, (tt) => {
		tt.deepEqual(sentState(), { user: "Verified", cursor: 1 });
	});
});

test("a beforeHandleAwareness in the configuration is a hook", async (t) => {
	const server = await newHocuspocus(t, {
		async beforeHandleAwareness() {},
	});

	const provider = newHocuspocusProvider(t, server);
	provider.setAwarenessField("user", "a");

	await retryableAssertion(t, (tt) => {
		tt.true(
			server.documents
				.get("hocuspocus-test")
				?.callbacks.isBeforeHandleAwarenessActive?.(),
		);
	});
});

test("a callback assigned to a loaded document's callbacks runs", async (t) => {
	const server = await newHocuspocus(t);

	const sending = newHocuspocusProvider(t, server);
	const receiving = newHocuspocusProvider(t, server);
	const sentState = () =>
		receiving.awareness?.getStates().get(sending.document.clientID);

	sending.setAwarenessField("user", "Spoofed");

	await retryableAssertion(t, (tt) => {
		tt.is(sentState()?.user, "Spoofed");
	});

	const document = server.documents.get("hocuspocus-test");
	t.truthy(document);
	if (document) {
		document.callbacks.beforeHandleAwareness = async (_, states) => {
			for (const state of states.values()) {
				state.user = "Verified";
			}
		};
	}

	sending.setAwarenessField("cursor", 1);

	await retryableAssertion(t, (tt) => {
		tt.deepEqual(sentState(), { user: "Verified", cursor: 1 });
	});
});
