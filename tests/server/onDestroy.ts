import test from "ava";
import { newHocuspocus, newHocuspocusProvider, sleep } from "../utils/index.ts";
import { retryableAssertion } from "../utils/retryableAssertion.ts";

test("executes the onDestroy hook and has the instance", async (t) => {
	await new Promise(async (resolve) => {
		const hocuspocus = await newHocuspocus(t, {
			async onDestroy({ instance }) {
				t.is(instance, hocuspocus);

				resolve("done");
			},
		});

		await hocuspocus.server!.destroy();
	});
});

test("destroy works if no document is open", async (t) => {
	await new Promise(async (resolve) => {
		const hocuspocus = await newHocuspocus(t);

		await hocuspocus.server!.destroy();

		t.pass();
		resolve("");
	});
});

test("executes the onDestroy hook from a custom extension", async (t) => {
	await new Promise(async (resolve) => {
		class CustomExtension {
			async onDestroy() {
				t.pass();

				resolve("done");
			}
		}

		const hocuspocus = await newHocuspocus(t, {
			extensions: [new CustomExtension()],
		});

		await hocuspocus.server!.destroy();
	});
});

test("destroy closes all connections", async (t) => {
	await new Promise(async (resolve) => {
		const hocuspocus = await newHocuspocus(t);

		const provider1 = newHocuspocusProvider(t, hocuspocus);

		await retryableAssertion(t, (t2) => t2.is(provider1.synced, true));

		t.is(hocuspocus.getConnectionsCount(), 1);
		t.is(hocuspocus.getDocumentsCount(), 1);

		await hocuspocus.server!.destroy();

		t.is(hocuspocus.getConnectionsCount(), 0);
		t.is(hocuspocus.getDocumentsCount(), 0);

		resolve("");
	});
});

test("destroy does not call onStoreDocument if nothing debounced", async (t) => {
	await new Promise(async (resolve) => {
		const server = await newHocuspocus(t, {
			async onStoreDocument() {
				t.fail();
			},
		});

		const provider = newHocuspocusProvider(t, server);

		await retryableAssertion(t, (t2) => t2.is(provider.synced, true));

		await server.server!.destroy();

		resolve("");
	});
});

test("destroy does not call onStoreDocument after debounced onStoreDocument executes", async (t) => {
	await new Promise(async (resolve) => {
		let called = 0;

		const server = await newHocuspocus(t, {
			debounce: 200,
			unloadImmediately: true,
			async onStoreDocument() {
				called += 1;
			},
		});

		const provider = newHocuspocusProvider(t, server, {
			onSynced() {
				// Dummy change to trigger onStoreDocument
				provider.document.getArray("foo").push(["foo"]);
			},
		});

		await retryableAssertion(t, (t2) => t2.is(provider.synced, true));

		// Wait for the debounced onStoreDocument to execute
		await new Promise((r) => setTimeout(r, 400));

		await server.server!.destroy();

		t.is(called, 1);

		resolve("");
	});
});

test("destroy calls onStoreDocument before returning if debounced", async (t) => {
	await new Promise(async (resolve) => {
		let called = false;

		const hocuspocus = await newHocuspocus(t, {
			async onStoreDocument() {
				called = true;
			},
		});

		const provider = newHocuspocusProvider(t, hocuspocus, {
			onSynced() {
				// Dummy change to trigger onStoreDocument
				provider.document.getArray("foo").push(["foo"]);
			},
		});

		const provider1 = newHocuspocusProvider(t, hocuspocus);

		await retryableAssertion(t, (t2) => t2.is(provider1.synced, true));

		t.is(called, false);
		await hocuspocus.server!.destroy();
		t.is(called, true);

		resolve("");
	});
});

test("destroy calls onStoreDocument before returning, even with unloadImmediately=false if debounced", async (t) => {
	await new Promise(async (resolve) => {
		let called = false;

		const hocuspocus = await newHocuspocus(t, {
			async onStoreDocument() {
				called = true;
			},
			unloadImmediately: false,
		});

		const provider = newHocuspocusProvider(t, hocuspocus, {
			onSynced() {
				// Dummy change to trigger onStoreDocument
				provider.document.getArray("foo").push(["foo"]);
			},
		});

		const provider1 = newHocuspocusProvider(t, hocuspocus);

		await retryableAssertion(t, (t2) => t2.is(provider1.synced, true));
		await retryableAssertion(t, (t2) => t2.is(provider.synced, true));

		t.is(called, false);
		await hocuspocus.server!.destroy();
		t.is(called, true);

		resolve("");
	});
});

test("destroy calls onStoreDocument before returning, even with unloadImmediately=false, with multiple docs if debounced", async (t) => {
	await new Promise(async (resolve) => {
		let called = 0;

		const hocuspocus = await newHocuspocus(t, {
			async onStoreDocument() {
				called += 1;
			},
			unloadImmediately: false,
		});

		const provider1 = newHocuspocusProvider(t, hocuspocus, {
			name: "test1",
			onSynced() {
				provider1.document.getArray("foo").push(["foo"]);
			},
		});
		const provider2 = newHocuspocusProvider(t, hocuspocus, {
			name: "test2",
			onSynced() {
				provider2.document.getArray("foo").push(["foo"]);
			},
		});
		const provider3 = newHocuspocusProvider(t, hocuspocus, {
			name: "test3",
			onSynced() {
				provider3.document.getArray("foo").push(["foo"]);
			},
		});

		await retryableAssertion(t, (t2) => t2.is(provider1.synced, true));
		await retryableAssertion(t, (t2) => t2.is(provider2.synced, true));
		await retryableAssertion(t, (t2) => t2.is(provider3.synced, true));

		// Wait for all changes to reach the server and trigger debounced stores
		await retryableAssertion(t, (t2) => {
			t2.true(hocuspocus.debouncer.isDebounced("onStoreDocument-test1"));
			t2.true(hocuspocus.debouncer.isDebounced("onStoreDocument-test2"));
			t2.true(hocuspocus.debouncer.isDebounced("onStoreDocument-test3"));
		});

		t.is(called, 0);
		await hocuspocus.server!.destroy();
		await retryableAssertion(t, (t2) => t2.is(called, 3));

		resolve("");
	});
});

test("destroy calls onStoreDocument before returning, with multiple docs if debounced", async (t) => {
	await new Promise(async (resolve) => {
		let called = 0;

		const hocuspocus = await newHocuspocus(t, {
			async onStoreDocument() {
				called += 1;
			},
			unloadImmediately: true,
		});

		const provider1 = newHocuspocusProvider(t, hocuspocus, {
			name: "test1",
			onSynced() {
				provider1.document.getArray("foo").push(["foo"]);
			},
		});
		const provider2 = newHocuspocusProvider(t, hocuspocus, {
			name: "test2",
			onSynced() {
				provider2.document.getArray("foo").push(["foo"]);
			},
		});
		const provider3 = newHocuspocusProvider(t, hocuspocus, {
			name: "test3",
			onSynced() {
				provider3.document.getArray("foo").push(["foo"]);
			},
		});

		await retryableAssertion(t, (t2) => t2.is(provider1.synced, true));
		await retryableAssertion(t, (t2) => t2.is(provider2.synced, true));
		await retryableAssertion(t, (t2) => t2.is(provider3.synced, true));

		// Wait for all changes to reach the server and trigger debounced stores
		await retryableAssertion(t, (t2) => {
			t2.true(hocuspocus.debouncer.isDebounced("onStoreDocument-test1"));
			t2.true(hocuspocus.debouncer.isDebounced("onStoreDocument-test2"));
			t2.true(hocuspocus.debouncer.isDebounced("onStoreDocument-test3"));
		});

		t.is(called, 0);
		await hocuspocus.server!.destroy();

		await retryableAssertion(t, (t2) => t2.is(called, 3));

		resolve("");
	});
});

test("destroy waits for a document that is still loading before onDestroy", async (t) => {
	let finishLoading!: () => void;
	const loading = new Promise<void>((resolve) => {
		finishLoading = resolve;
	});
	const events: string[] = [];
	const hocuspocus = await newHocuspocus(t, {
		async onLoadDocument() {
			events.push("load started");
			await loading;
			events.push("load finished");
		},
		async onDestroy() {
			events.push("destroy");
		},
	});
	newHocuspocusProvider(t, hocuspocus);
	await retryableAssertion(t, (t2) => t2.deepEqual(events, ["load started"]));

	// No document is loaded yet, so none has to unload: only the load holds
	// onDestroy back, whose extensions it may still use.
	const destroyed = hocuspocus.server!.destroy();
	await sleep(100);
	t.deepEqual(events, ["load started"]);

	finishLoading();
	await destroyed;
	t.deepEqual(events, ["load started", "load finished", "destroy"]);
});
