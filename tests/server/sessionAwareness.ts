import { parseRoutingKey } from "@hocuspocus/common";
import type { onAuthenticatePayload, connectedPayload } from "@hocuspocus/server";
import test from "ava";
import { readVarString, createDecoder } from "lib0/decoding";
import {
	newHocuspocus,
	newHocuspocusProvider,
	newHocuspocusProviderWebsocket,
} from "../utils/index.ts";
import { retryableAssertion } from "../utils/retryableAssertion.ts";

test("sessionAwareness: two providers with same doc name both connect successfully", async (t) => {
	await new Promise(async (resolve) => {
		let connectedCount = 0;

		const server = await newHocuspocus(t, {
			async onAuthenticate() {
				return true;
			},
		});

		const socket = newHocuspocusProviderWebsocket(t, server);

		const provider1 = newHocuspocusProvider(
			t,
			server,
			{
				websocketProvider: socket,
				token: "token-1",
				name: "shared-doc",
				sessionAwareness: true,
				onAuthenticated() {
					connectedCount++;
					if (connectedCount === 2) {
						resolve("done");
					}
				},
			},
		);

		const provider2 = newHocuspocusProvider(
			t,
			server,
			{
				websocketProvider: socket,
				token: "token-2",
				name: "shared-doc",
				sessionAwareness: true,
				onAuthenticated() {
					connectedCount++;
					if (connectedCount === 2) {
						resolve("done");
					}
				},
			},
		);

		t.truthy(provider1);
		t.truthy(provider2);
	});
});

test("sessionAwareness: auth failure isolation - provider A fails, provider B succeeds", async (t) => {
	const server = await newHocuspocus(t, {
		async onAuthenticate({ token }: onAuthenticatePayload) {
			if (token === "bad-token") {
				throw new Error("unauthorized");
			}
			return true;
		},
	});

	const socket = newHocuspocusProviderWebsocket(t, server);

	const providerFail = newHocuspocusProvider(
		t,
		server,
		{
			websocketProvider: socket,
			token: "bad-token",
			name: "shared-doc",
			sessionAwareness: true,
			onAuthenticated() {
				t.fail("providerFail should not authenticate");
			},
		},
	);

	const providerOK = newHocuspocusProvider(
		t,
		server,
		{
			websocketProvider: socket,
			token: "good-token",
			name: "shared-doc",
			sessionAwareness: true,
			onAuthenticationFailed() {
				t.fail("providerOK should not fail auth");
			},
		},
	);

	await retryableAssertion(t, (tt) => {
		tt.is(providerFail.isAuthenticated, false);
		tt.is(providerOK.isAuthenticated, true);
		tt.is(server.getDocumentsCount(), 1);
	});
});

test("sessionAwareness: false - two providers with same name on same socket throws when first is authenticated", async (t) => {
	const server = await newHocuspocus(t, {
		async onAuthenticate() {
			return true;
		},
	});

	const socket = newHocuspocusProviderWebsocket(t, server);

	const provider1 = newHocuspocusProvider(t, server, {
		websocketProvider: socket,
		token: "token",
		name: "same-doc",
		sessionAwareness: false,
	});

	await retryableAssertion(t, (tt) => {
		tt.is(provider1.isAuthenticated, true);
	});

	// Now that provider1 is authenticated, attaching a second with the same name should throw
	t.throws(() => {
		newHocuspocusProvider(t, server, {
			websocketProvider: socket,
			token: "token",
			name: "same-doc",
			sessionAwareness: false,
		});
	});
});

test("sessionAwareness: connection has correct sessionId", async (t) => {
	await new Promise(async (resolve) => {
		const server = await newHocuspocus(t, {
			async onAuthenticate() {
				return true;
			},
			async connected({ connection }: connectedPayload) {
				t.truthy(connection.sessionId);
				t.is(typeof connection.sessionId, "string");
				t.truthy(connection.sessionId!.length > 0);
				resolve("done");
			},
		});

		const socket = newHocuspocusProviderWebsocket(t, server);

		newHocuspocusProvider(t, server, {
			websocketProvider: socket,
			token: "test-token",
			name: "session-doc",
			sessionAwareness: true,
		});
	});
});

test("sessionAwareness: connection has correct providerVersion", async (t) => {
	await new Promise(async (resolve) => {
		const server = await newHocuspocus(t, {
			async onAuthenticate() {
				return true;
			},
			async connected({ connection }: connectedPayload) {
				t.is(typeof connection.providerVersion, "string");
				t.truthy(connection.providerVersion!.length > 0);
				resolve("done");
			},
		});

		const socket = newHocuspocusProviderWebsocket(t, server);

		newHocuspocusProvider(t, server, {
			websocketProvider: socket,
			token: "test-token",
			name: "session-doc",
			sessionAwareness: true,
		});
	});
});

test("sessionAwareness: all outgoing messages from provider include sessionId in routing key", async (t) => {
	const server = await newHocuspocus(t, {
		async onAuthenticate() {
			return true;
		},
	});

	const socket = newHocuspocusProviderWebsocket(t, server);

	const sentMessages: Uint8Array[] = [];
	const originalSend = socket.webSocket!.send.bind(socket.webSocket!);

	const provider = newHocuspocusProvider(t, server, {
		websocketProvider: socket,
		token: "test-token",
		name: "session-doc",
		sessionAwareness: true,
	});

	await retryableAssertion(t, (tt) => {
		tt.is(provider.isSynced, true);
	});

	// Monkey-patch send to capture outgoing messages
	socket.webSocket!.send = (data: any) => {
		if (data instanceof Uint8Array || data instanceof ArrayBuffer) {
			sentMessages.push(new Uint8Array(data));
		}
		originalSend(data);
	};

	// Trigger a document update which causes the provider to send an UpdateMessage
	provider.document.getMap("test").set("key", "value");

	await retryableAssertion(t, (tt) => {
		tt.true(sentMessages.length > 0, "should have captured outgoing messages");

		for (const msg of sentMessages) {
			const decoder = createDecoder(msg);
			const routingKey = readVarString(decoder);
			const { documentName, sessionId } = parseRoutingKey(routingKey);
			tt.is(documentName, "session-doc", `message routing key should contain correct document name, got: ${routingKey}`);
			tt.truthy(sessionId, `every outgoing message should include a sessionId in the routing key, got: ${routingKey}`);
		}
	});
});

test("sessionAwareness: SyncStep2 reply includes sessionId in routing key", async (t) => {
	const server = await newHocuspocus(t, {
		async onAuthenticate() {
			return true;
		},
	});

	const socket = newHocuspocusProviderWebsocket(t, server);

	const provider = newHocuspocusProvider(t, server, {
		websocketProvider: socket,
		token: "test-token",
		name: "sync-reply-doc",
		sessionAwareness: true,
	});

	await retryableAssertion(t, (tt) => {
		tt.is(provider.isSynced, true);
	});

	// Capture all outgoing messages
	const sentMessages: Uint8Array[] = [];
	const originalSend = socket.webSocket!.send.bind(socket.webSocket!);
	socket.webSocket!.send = (data: any) => {
		if (data instanceof Uint8Array || data instanceof ArrayBuffer) {
			sentMessages.push(new Uint8Array(data));
		}
		originalSend(data);
	};

	// Force a sync which triggers SyncStep1 -> server replies with SyncStep1 -> provider replies with SyncStep2
	provider.forceSync();

	await retryableAssertion(t, (tt) => {
		// We expect at least the SyncStep1 from forceSync plus the SyncStep2 reply
		tt.true(sentMessages.length >= 2, `should have at least 2 messages, got ${sentMessages.length}`);

		for (const msg of sentMessages) {
			const decoder = createDecoder(msg);
			const routingKey = readVarString(decoder);
			const { sessionId } = parseRoutingKey(routingKey);
			tt.truthy(sessionId, `message should include sessionId, got routing key: ${routingKey}`);
		}
	});
});

test("sessionAwareness: providers with different doc names still work without sessionAwareness", async (t) => {
	await new Promise(async (resolve) => {
		let connectedCount = 0;

		const server = await newHocuspocus(t, {
			async onAuthenticate() {
				return true;
			},
		});

		const socket = newHocuspocusProviderWebsocket(t, server);

		newHocuspocusProvider(
			t,
			server,
			{
				websocketProvider: socket,
				token: "token-1",
				name: "doc-1",
				onAuthenticated() {
					connectedCount++;
					if (connectedCount === 2) {
						resolve("done");
					}
				},
			},
		);

		newHocuspocusProvider(
			t,
			server,
			{
				websocketProvider: socket,
				token: "token-2",
				name: "doc-2",
				onAuthenticated() {
					connectedCount++;
					if (connectedCount === 2) {
						resolve("done");
					}
				},
			},
		);

		t.pass();
	});
});
