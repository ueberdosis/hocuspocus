import type { HocuspocusProvider } from "@hocuspocus/provider";
import test from "ava";
import {
	newHocuspocus,
	newHocuspocusProvider,
	newHocuspocusProviderWebsocket,
} from "../utils/index.ts";
import { retryableAssertion } from "../utils/retryableAssertion.ts";

test("reauthenticate() sends a fresh token and syncs on the same socket", async (t) => {
	const server = await newHocuspocus(t, {
		async onAuthenticate({ token }) {
			if (token !== "valid-token") {
				throw new Error("token expired");
			}
		},
	});

	const socket = newHocuspocusProviderWebsocket(t, server);

	let connectCount = 0;
	socket.on("connect", () => {
		connectCount++;
	});

	let tokenCalls = 0;
	let authenticationFailedCount = 0;
	let socketAtFailure: typeof socket.webSocket = null;

	const provider = await new Promise<HocuspocusProvider>((resolve) => {
		const provider = newHocuspocusProvider(t, server, {
			websocketProvider: socket,
			token: () => {
				tokenCalls++;
				return tokenCalls === 1 ? "expired-token" : "valid-token";
			},
			onAuthenticationFailed() {
				authenticationFailedCount++;
				socketAtFailure = socket.webSocket;
				provider.reauthenticate();
			},
			onSynced() {
				resolve(provider);
			},
		});
	});

	t.is(tokenCalls, 2);
	t.is(authenticationFailedCount, 1);
	t.true(provider.isAuthenticated);
	t.is(provider.authorizedScope, "read-write");
	t.true(provider.isSynced);
	t.is(connectCount, 1);
	t.truthy(socketAtFailure);
	t.is(socket.webSocket, socketAtFailure);
});

test("reauthenticate() does nothing when the socket is not connected", async (t) => {
	const server = await newHocuspocus(t);

	let tokenCalls = 0;

	const provider = newHocuspocusProvider(
		t,
		server,
		{
			token: () => {
				tokenCalls++;
				return "token";
			},
		},
		{ autoConnect: false },
	);

	await t.notThrowsAsync(() => provider.reauthenticate());

	t.is(tokenCalls, 0);
	t.false(provider.isAuthenticated);
});

test("reauthenticate() keeps an authenticated provider as it is", async (t) => {
	const server = await newHocuspocus(t);

	let tokenCalls = 0;

	const provider = newHocuspocusProvider(t, server, {
		token: () => {
			tokenCalls++;
			return "token";
		},
	});

	await retryableAssertion(t, (tt) => {
		tt.true(provider.isAuthenticated);
	});
	const callsAfterAuth = tokenCalls;

	await provider.reauthenticate();

	t.true(provider.isAuthenticated);
	t.is(tokenCalls, callsAfterAuth);
});
