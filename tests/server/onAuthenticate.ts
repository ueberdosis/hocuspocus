import { WebSocketStatus } from "@hocuspocus/provider";
import type {
	onAuthenticatePayload,
	onLoadDocumentPayload,
} from "@hocuspocus/server";
import test from "ava";
import {
	newHocuspocus,
	newHocuspocusProvider,
	newHocuspocusProviderWebsocket,
	sleep,
} from "../utils/index.ts";
import { retryableAssertion } from "../utils/retryableAssertion.ts";

test("executes the onAuthenticate callback", async (t) => {
	await new Promise(async (resolve) => {
		const server = await newHocuspocus({
			async onAuthenticate() {
				t.pass();
				resolve("done");
			},
		});

		newHocuspocusProvider(server, {
			token: "SUPER-SECRET-TOKEN",
		});
	});
});

test("executes the onAuthenticate callback from a custom extension", async (t) => {
	await new Promise(async (resolve) => {
		class CustomExtension {
			async onAuthenticate() {
				t.pass();
				resolve("done");
			}
		}

		const server = await newHocuspocus({
			extensions: [new CustomExtension()],
		});

		newHocuspocusProvider(server, {
			token: "SUPER-SECRET-TOKEN",
		});
	});
});

test("confirms the `Token` message with an `Authenticated` message", async (t) => {
	await new Promise(async (resolve) => {
		const server = await newHocuspocus({
			async onAuthenticate() {
				// success
				return true;
			},
		});

		newHocuspocusProvider(server, {
			token: "SUPER-SECRET-TOKEN",
			onAuthenticated() {
				t.pass();
				resolve("done");
			},
		});
	});
});

test("replies with a `PermissionDenied` message when authentication fails", async (t) => {
	await new Promise(async (resolve) => {
		const server = await newHocuspocus({
			async onAuthenticate() {
				// fail
				throw Error();
			},
		});

		newHocuspocusProvider(server, {
			token: "SUPER-SECRET-TOKEN",
			onAuthenticationFailed() {
				t.pass();
				resolve("done");
			},
		});
	});
});

test("passes context from onAuthenticate to onLoadDocument", async (t) => {
	await new Promise(async (resolve) => {
		const mockContext = {
			user: 123,
		};

		const server = await newHocuspocus({
			async onAuthenticate() {
				return mockContext;
			},
			async onLoadDocument({ context }: onLoadDocumentPayload) {
				t.deepEqual(context, mockContext);

				resolve("done");
			},
		});

		newHocuspocusProvider(server, {
			token: "SUPER-SECRET-TOKEN",
		});
	});
});

test("ignores the authentication token when having no onAuthenticate hook", async (t) => {
	await new Promise(async (resolve) => {
		const server = await newHocuspocus();

		newHocuspocusProvider(server, {
			token: "SUPER-SECRET-TOKEN",
			onOpen() {
				t.pass();
				resolve("done");
			},
		});
	});
});

test("has the authentication token", async (t) => {
	await new Promise(async (resolve) => {
		const server = await newHocuspocus({
			async onAuthenticate({ token }: onAuthenticatePayload) {
				t.is(token, "SUPER-SECRET-TOKEN");

				resolve("done");
			},
		});

		newHocuspocusProvider(server, {
			token: "SUPER-SECRET-TOKEN",
		});
	});
});

test("does not disconnect provider when the onAuthenticate hook throws an Error", async (t) => {
	const server = await newHocuspocus({
		async onAuthenticate() {
			throw new Error();
		},
		// MUST NOT BE CALLED
		async onLoadDocument() {
			t.fail(
				"WARNING: When onAuthenticate fails onLoadDocument must not be called.",
			);
		},
	});

	const provider = newHocuspocusProvider(server, {
		onClose() {
			t.fail();
		},
		token: "SUPER-SECRET-TOKEN",
	});

	await retryableAssertion(t, (tt) => {
		tt.is(
			provider.configuration.websocketProvider.status,
			WebSocketStatus.Connected,
		);
		tt.is(server.getDocumentsCount(), 0);
		tt.is(server.getConnectionsCount(), 0);
	});
});

test("connects with the correct token", async (t) => {
	await new Promise(async (resolve) => {
		const server = await newHocuspocus({
			async onAuthenticate({ token }: onAuthenticatePayload) {
				if (token !== "SUPER-SECRET-TOKEN") {
					throw new Error();
				}
			},
			async onLoadDocument() {
				t.pass();
				resolve("done");
			},
		});

		newHocuspocusProvider(server, {
			token: "SUPER-SECRET-TOKEN",
		});
	});
});

test("onAuthenticate has access to document name", async (t) => {
	const docName = "superSecretDoc";
	const requiredToken = "SUPER-SECRET-TOKEN";

	await new Promise(async (resolve) => {
		const server = await newHocuspocus({
			async onAuthenticate({ token, documentName }: onAuthenticatePayload) {
				if (documentName !== docName) {
					throw new Error();
				}

				if (token !== requiredToken) {
					throw new Error();
				}
			},
		});

		newHocuspocusProvider(server, {
			token: requiredToken,
			name: docName,
			onAuthenticated() {
				t.pass();
				resolve("done");
			},
		});
	});
});

test("onAuthenticate wrong auth only disconnects affected doc (when multiplexing)", async (t) => {
	const docName = "superSecretDoc";
	const requiredToken = "SUPER-SECRET-TOKEN";

	const server = await newHocuspocus({
		async onAuthenticate({ token, documentName }: onAuthenticatePayload) {
			if (documentName !== docName) {
				throw new Error();
			}

			if (token !== requiredToken) {
				throw new Error();
			}
		},
	});

	const socket = newHocuspocusProviderWebsocket(server);

	const providerFail = newHocuspocusProvider(server, {
		websocketProvider: socket,
		token: "wrongToken",
		name: "otherDocu",
		onAuthenticated() {
			t.fail();
		},
	});

	await sleep(100);

	const providerOK = newHocuspocusProvider(server, {
		websocketProvider: socket,
		token: requiredToken,
		name: docName,
		onAuthenticationFailed() {
			t.fail();
		},
	});

	await retryableAssertion(t, (tt) => {
		tt.is(socket.status, WebSocketStatus.Connected);
		tt.is(server.getDocumentsCount(), 1);
		tt.is(server.getConnectionsCount(), 1);
	});
});

test("onAuthenticate readonly auth only affects 1 doc (when multiplexing)", async (t) => {
	const server = await newHocuspocus({
		async onAuthenticate({
			token,
			documentName,
			connectionConfig,
		}: onAuthenticatePayload) {
			if (token === "readonly") {
				connectionConfig.readOnly = true;
			}
		},
	});

	const socket = newHocuspocusProviderWebsocket(server);

	const providerReadOnly = newHocuspocusProvider(server, {
		websocketProvider: socket,
		token: "readonly",
		name: "doc1",
		onAuthenticationFailed() {
			t.fail();
		},
	});

	const providerOK = newHocuspocusProvider(server, {
		websocketProvider: socket,
		token: "read+write",
		name: "doc2",
		onAuthenticationFailed() {
			t.fail();
		},
	});

	await retryableAssertion(t, (tt) => {
		tt.is(socket.status, WebSocketStatus.Connected);
		tt.is(socket.status, WebSocketStatus.Connected);
		tt.is(server.getDocumentsCount(), 2);
		tt.is(server.getConnectionsCount(), 1);
		tt.is(socket.status, WebSocketStatus.Connected);
	});

	// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
	t.is(
		server.documents.get("doc1")!.connections.values().next().value!.connection
			.readOnly,
		true,
	);
	// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
	t.is(
		server.documents.get("doc2")!.connections.values().next().value!.connection
			.readOnly,
		false,
	);
});

test("onAuthenticate is called even if no token is provided", async (t) => {
	const docName = "superSecretDoc";

	await new Promise(async (resolve) => {
		const server = await newHocuspocus({
			async onAuthenticate({ documentName }: onAuthenticatePayload) {
				t.pass();
				resolve("done");
			},
		});

		newHocuspocusProvider(server, {
			name: docName,
		});
	});
});
