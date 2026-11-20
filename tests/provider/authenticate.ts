import type { HocuspocusProvider } from "@hocuspocus/provider";
import test from "ava";
import {
	newHocuspocus,
	newHocuspocusProvider,
	newHocuspocusProviderWebsocket,
} from "../utils/index.ts";
import { retryableAssertion } from "../utils/retryableAssertion.ts";

test("authenticate() sends a fresh token and syncs on the same socket", async (t) => {
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
				provider.authenticate();
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

test("authenticate() does nothing when the socket is not connected", async (t) => {
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

	await t.notThrowsAsync(() => provider.authenticate());

	t.is(tokenCalls, 0);
	t.false(provider.isAuthenticated);
});

test("authenticate() keeps an authenticated provider as it is", async (t) => {
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

	await provider.authenticate();

	t.true(provider.isAuthenticated);
	t.is(tokenCalls, callsAfterAuth);
});

test("authenticate() from authenticationFailed sends a token after a failed token refresh", async (t) => {
	const syncedTokens: string[] = [];
	const server = await newHocuspocus(t, {
		async onTokenSync({ token }) {
			syncedTokens.push(token);
		},
	});

	let tokenCalls = 0;
	let failNextToken = false;
	let authenticationFailedCount = 0;

	const provider = newHocuspocusProvider(t, server, {
		token: () => {
			tokenCalls++;
			if (failNextToken) {
				failNextToken = false;
				throw new Error("token refresh failed");
			}
			return "token";
		},
		onAuthenticationFailed() {
			authenticationFailedCount++;
			provider.authenticate();
		},
	});

	await retryableAssertion(t, (tt) => {
		tt.true(provider.isAuthenticated);
	});
	const callsAfterAuth = tokenCalls;

	// The server asks an authenticated provider for a token (the provider
	// answers with sendToken()) and the token function throws, so the provider
	// reports authenticationFailed. A listener that calls authenticate()
	// right away must get through and send a fresh token.
	failNextToken = true;
	await provider.sendToken();

	t.is(authenticationFailedCount, 1);
	t.is(tokenCalls, callsAfterAuth + 2);
	await retryableAssertion(t, (tt) => {
		tt.deepEqual(syncedTokens, ["token"]);
	});
});
