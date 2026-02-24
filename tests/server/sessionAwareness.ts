import type { onAuthenticatePayload, connectedPayload } from "@hocuspocus/server";
import test from "ava";
import {
	newHocuspocus,
	newHocuspocusProvider,
	newHocuspocusProviderWebsocket,
} from "../utils/index.ts";
import { retryableAssertion } from "../utils/retryableAssertion.ts";

test("sessionAwareness: two providers with same doc name both connect successfully", async (t) => {
	await new Promise(async (resolve) => {
		let connectedCount = 0;

		const server = await newHocuspocus({
			async onAuthenticate() {
				return true;
			},
		});

		const socket = newHocuspocusProviderWebsocket(server);

		const provider1 = newHocuspocusProvider(
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
	const server = await newHocuspocus({
		async onAuthenticate({ token }: onAuthenticatePayload) {
			if (token === "bad-token") {
				throw new Error("unauthorized");
			}
			return true;
		},
	});

	const socket = newHocuspocusProviderWebsocket(server);

	const providerFail = newHocuspocusProvider(
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

test("sessionAwareness: false (default) - two providers with same name on same socket throws when first is authenticated", async (t) => {
	const server = await newHocuspocus({
		async onAuthenticate() {
			return true;
		},
	});

	const socket = newHocuspocusProviderWebsocket(server);

	const provider1 = newHocuspocusProvider(server, {
		websocketProvider: socket,
		token: "token",
		name: "same-doc",
	});

	await retryableAssertion(t, (tt) => {
		tt.is(provider1.isAuthenticated, true);
	});

	// Now that provider1 is authenticated, attaching a second with the same name should throw
	t.throws(() => {
		newHocuspocusProvider(server, {
			websocketProvider: socket,
			token: "token",
			name: "same-doc",
		});
	});
});

test("sessionAwareness: connection has correct sessionId", async (t) => {
	await new Promise(async (resolve) => {
		const server = await newHocuspocus({
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

		const socket = newHocuspocusProviderWebsocket(server);

		newHocuspocusProvider(server, {
			websocketProvider: socket,
			token: "test-token",
			name: "session-doc",
			sessionAwareness: true,
		});
	});
});

test("sessionAwareness: connection has correct providerVersion", async (t) => {
	await new Promise(async (resolve) => {
		const server = await newHocuspocus({
			async onAuthenticate() {
				return true;
			},
			async connected({ connection }: connectedPayload) {
				t.is(typeof connection.providerVersion, "string");
				t.truthy(connection.providerVersion!.length > 0);
				resolve("done");
			},
		});

		const socket = newHocuspocusProviderWebsocket(server);

		newHocuspocusProvider(server, {
			websocketProvider: socket,
			token: "test-token",
			name: "session-doc",
			sessionAwareness: true,
		});
	});
});

test("sessionAwareness: providers with different doc names still work without sessionAwareness", async (t) => {
	await new Promise(async (resolve) => {
		let connectedCount = 0;

		const server = await newHocuspocus({
			async onAuthenticate() {
				return true;
			},
		});

		const socket = newHocuspocusProviderWebsocket(server);

		newHocuspocusProvider(
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
