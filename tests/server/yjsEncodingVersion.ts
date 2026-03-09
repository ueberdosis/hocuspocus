import test from "ava";
import * as Y from "yjs";
import { newHocuspocus, newHocuspocusProvider } from "../utils/index.ts";
import { retryableAssertion } from "../utils/retryableAssertion.ts";

test("v1 server + v1 provider sync works (default)", async (t) => {
	const server = await newHocuspocus(t);

	const provider = newHocuspocusProvider(t, server, {
		onSynced() {
			provider.document.getArray("foo").insert(0, ["bar"]);
		},
	});

	await retryableAssertion(t, (tt) => {
		const doc = server.documents.get("hocuspocus-test");
		tt.truthy(doc);
		tt.is(doc!.getArray("foo").get(0), "bar");
	});
});

test("v2 server + v2 provider sync works", async (t) => {
	const server = await newHocuspocus(t, {
		yjsEncodingVersion: 2,
	});

	const provider = newHocuspocusProvider(t, server, {
		yjsEncodingVersion: 2,
		onSynced() {
			provider.document.getArray("foo").insert(0, ["bar"]);
		},
	});

	await retryableAssertion(t, (tt) => {
		const doc = server.documents.get("hocuspocus-test");
		tt.truthy(doc);
		tt.is(doc!.getArray("foo").get(0), "bar");
	});
});

test("v2 server + v1 provider falls back to v1 (backward compat)", async (t) => {
	const server = await newHocuspocus(t, {
		yjsEncodingVersion: 2,
	});

	// Provider uses default v1 — old client connecting to new server
	const provider = newHocuspocusProvider(t, server, {
		yjsEncodingVersion: 1,
		onSynced() {
			provider.document.getArray("foo").insert(0, ["bar"]);
		},
	});

	await retryableAssertion(t, (tt) => {
		const doc = server.documents.get("hocuspocus-test");
		tt.truthy(doc);
		tt.is(doc!.getArray("foo").get(0), "bar");
	});
});

test("v2 encoding syncs between two providers", async (t) => {
	const server = await newHocuspocus(t, {
		yjsEncodingVersion: 2,
	});

	await new Promise<void>(async (resolve) => {
		const provider1 = newHocuspocusProvider(t, server, {
			yjsEncodingVersion: 2,
			onSynced() {
				provider1.document.getArray("foo").insert(0, ["bar"]);
			},
		});

		const provider2 = newHocuspocusProvider(t, server, {
			yjsEncodingVersion: 2,
		});

		// Wait for provider2 to receive the update from provider1
		provider2.document.getArray("foo").observe(() => {
			const value = provider2.document.getArray("foo").get(0);
			if (value === "bar") {
				t.pass();
				resolve();
			}
		});
	});
});

test("v2 server stores document in v1 by default (storage is independent)", async (t) => {
	let storedState: Buffer | null = null;

	const server = await newHocuspocus(t, {
		yjsEncodingVersion: 2,
		async onStoreDocument({ document }) {
			// Default storage is v1 (encodeStateAsUpdate)
			storedState = Buffer.from(Y.encodeStateAsUpdate(document));
		},
	});

	const provider = newHocuspocusProvider(t, server, {
		yjsEncodingVersion: 2,
		onSynced() {
			provider.document.getArray("foo").insert(0, ["bar"]);
		},
	});

	await retryableAssertion(t, (tt) => {
		tt.truthy(storedState);
		// Verify the stored v1 state can be applied to a new document
		const doc = new Y.Doc();
		Y.applyUpdate(doc, storedState!);
		tt.is(doc.getArray("foo").get(0), "bar");
		doc.destroy();
	});
});

test("connection negotiates encoding version as min(server, client)", async (t) => {
	// Server supports up to v2, client requests v1
	const server = await newHocuspocus(t, {
		yjsEncodingVersion: 2,
		async connected({ connection }) {
			t.is(connection.yjsEncodingVersion, 1);
		},
	});

	newHocuspocusProvider(t, server, {
		yjsEncodingVersion: 1,
	});

	await retryableAssertion(t, (tt) => {
		tt.is(server.documents.size, 1);
	});
});

test("connection negotiates encoding version v2 when both support it", async (t) => {
	const server = await newHocuspocus(t, {
		yjsEncodingVersion: 2,
		async connected({ connection }) {
			t.is(connection.yjsEncodingVersion, 2);
		},
	});

	newHocuspocusProvider(t, server, {
		yjsEncodingVersion: 2,
	});

	await retryableAssertion(t, (tt) => {
		tt.is(server.documents.size, 1);
	});
});
