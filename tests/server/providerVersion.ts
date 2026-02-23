import type {
	connectedPayload,
	onAuthenticatePayload,
	onConnectPayload,
} from "@hocuspocus/server";
import test from "ava";
import {
	newHocuspocus,
	newHocuspocusProvider,
	newHocuspocusProviderWebsocket,
} from "../utils/index.ts";

test("onAuthenticate receives providerVersion", async (t) => {
	await new Promise(async (resolve) => {
		const server = await newHocuspocus({
			async onAuthenticate({ providerVersion }: onAuthenticatePayload) {
				t.is(typeof providerVersion, "string");
				t.not(providerVersion, null);
				resolve("done");
			},
		});

		newHocuspocusProvider(server, {
			token: "test-token",
		});
	});
});

test("onConnect receives providerVersion", async (t) => {
	await new Promise(async (resolve) => {
		const server = await newHocuspocus({
			async onConnect({ providerVersion }: onConnectPayload) {
				t.is(typeof providerVersion, "string");
				t.not(providerVersion, null);
				resolve("done");
			},
		});

		newHocuspocusProvider(server, {
			token: "test-token",
		});
	});
});

test("connected receives providerVersion and it is set on the connection", async (t) => {
	await new Promise(async (resolve) => {
		const server = await newHocuspocus({
			async connected({
				providerVersion,
				connection,
			}: connectedPayload) {
				t.is(typeof providerVersion, "string");
				t.not(providerVersion, null);
				t.is(connection.providerVersion, providerVersion);
				resolve("done");
			},
		});

		newHocuspocusProvider(server, {
			token: "test-token",
		});
	});
});

test("providerVersion is a non-empty string", async (t) => {
	await new Promise(async (resolve) => {
		const server = await newHocuspocus({
			async onAuthenticate({ providerVersion }: onAuthenticatePayload) {
				t.is(typeof providerVersion, "string");
				t.truthy(providerVersion!.length > 0);
				resolve("done");
			},
		});

		newHocuspocusProvider(server, {
			token: "test-token",
		});
	});
});

test("providerVersion is the same across multiplexed documents", async (t) => {
	await new Promise(async (resolve) => {
		const versions: string[] = [];

		const server = await newHocuspocus({
			async onAuthenticate({ providerVersion }: onAuthenticatePayload) {
				versions.push(providerVersion!);
				if (versions.length === 2) {
					t.is(versions[0], versions[1]);
					t.not(versions[0], null);
					resolve("done");
				}
			},
		});

		const ws = newHocuspocusProviderWebsocket(server);

		newHocuspocusProvider(server, { name: "doc1", token: "t1" }, {}, ws);
		newHocuspocusProvider(server, { name: "doc2", token: "t2" }, {}, ws);
	});
});
