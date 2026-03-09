import { Database } from "@hocuspocus/extension-database";
import test from "ava";
import * as Y from "yjs";
import { newHocuspocus, newHocuspocusProvider } from "../utils/index.ts";
import { retryableAssertion } from "../utils/retryableAssertion.ts";

test("Database extension stores in v1 by default", async (t) => {
	let storedState: Buffer | null = null;

	const server = await newHocuspocus(t, {
		extensions: [
			new Database({
				async fetch() {
					return null;
				},
				async store({ state }) {
					storedState = state;
				},
			}),
		],
	});

	const provider = newHocuspocusProvider(t, server, {
		onSynced() {
			provider.document.getArray("foo").insert(0, ["bar"]);
		},
	});

	await retryableAssertion(t, (tt) => {
		tt.truthy(storedState);
		// v1 state should be directly applicable with Y.applyUpdate
		const doc = new Y.Doc();
		Y.applyUpdate(doc, storedState!);
		tt.is(doc.getArray("foo").get(0), "bar");
		doc.destroy();
	});
});

test("Database extension stores in v2 when configured", async (t) => {
	let storedState: Buffer | null = null;

	const server = await newHocuspocus(t, {
		extensions: [
			new Database({
				encodingVersion: 2,
				async fetch() {
					return null;
				},
				async store({ state }) {
					storedState = state;
				},
			}),
		],
	});

	const provider = newHocuspocusProvider(t, server, {
		onSynced() {
			provider.document.getArray("foo").insert(0, ["bar"]);
		},
	});

	await retryableAssertion(t, (tt) => {
		tt.truthy(storedState);
		// v2 state should be applicable with Y.applyUpdateV2
		const doc = new Y.Doc();
		Y.applyUpdateV2(doc, storedState!);
		tt.is(doc.getArray("foo").get(0), "bar");
		doc.destroy();
	});
});

test("Database extension loads v2 state when configured", async (t) => {
	// Create a v2-encoded document state
	const sourceDoc = new Y.Doc();
	sourceDoc.getArray("foo").insert(0, ["from-v2-storage"]);
	const v2State = Y.encodeStateAsUpdateV2(sourceDoc);
	sourceDoc.destroy();

	const server = await newHocuspocus(t, {
		extensions: [
			new Database({
				encodingVersion: 2,
				async fetch() {
					return v2State;
				},
				async store() {},
			}),
		],
	});

	const provider = newHocuspocusProvider(t, server);

	await retryableAssertion(t, (tt) => {
		tt.is(provider.document.getArray("foo").get(0), "from-v2-storage");
	});
});

test("Database extension round-trips v2 storage correctly", async (t) => {
	let storedState: Buffer | null = null;

	const server = await newHocuspocus(t, {
		extensions: [
			new Database({
				encodingVersion: 2,
				async fetch() {
					return storedState;
				},
				async store({ state }) {
					storedState = state;
				},
			}),
		],
	});

	// First provider writes data
	const provider1 = newHocuspocusProvider(t, server, {
		onSynced() {
			provider1.document.getArray("foo").insert(0, ["round-trip-test"]);
		},
	});

	await retryableAssertion(t, (tt) => {
		tt.truthy(storedState);
	});

	// Verify stored state is v2 by applying with applyUpdateV2
	const verifyDoc = new Y.Doc();
	Y.applyUpdateV2(verifyDoc, storedState!);
	t.is(verifyDoc.getArray("foo").get(0), "round-trip-test");
	verifyDoc.destroy();
});
