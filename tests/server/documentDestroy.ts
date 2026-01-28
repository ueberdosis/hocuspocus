import test from "ava";
import { newHocuspocus, newHocuspocusProvider, sleep } from "../utils/index.ts";

/**
 * These tests verify that Document.destroy() properly cleans up event listeners
 * and awareness to prevent memory leaks when async operations continue to
 * call transact() on destroyed documents.
 *
 * Background: When a document is destroyed but async logic (e.g., server-side
 * AI processing) still holds a reference and calls transact(), the event
 * listeners would continue to fire, causing:
 * - Retained references preventing garbage collection
 * - Unnecessary CPU usage from processing updates on destroyed documents
 * - Memory leaks from accumulated "zombie" documents
 */

test("handleUpdate is not called after document is destroyed", async (t) => {
	let updateCallsAfterDestroy = 0;

	await new Promise(async (resolve) => {
		const server = await newHocuspocus({
			async onLoadDocument({ document }) {
				// Store original callback
				const originalOnUpdate = document.callbacks.onUpdate;

				// Track update calls
				document.onUpdate((doc, connection, update) => {
					if (doc.isDestroyed) {
						updateCallsAfterDestroy++;
					}
					originalOnUpdate(doc, connection, update);
				});
			},
		});

		const provider = newHocuspocusProvider(server, {
			async onSynced() {
				// Make a change to ensure document is active
				provider.document.getMap("test").set("key", "value");

				await sleep(50);

				// Disconnect the provider, which will trigger document unload/destroy
				provider.configuration.websocketProvider.disconnect();
				provider.disconnect();

				// Wait for document to be destroyed
				await sleep(100);

				// The document should now be destroyed
				// Any updates that happen now should NOT trigger handleUpdate
				t.is(updateCallsAfterDestroy, 0, "No updates should be processed after destroy");
				resolve("done");
			},
		});
	});
});

test("transact on destroyed document does not broadcast to connections", async (t) => {
	let broadcastCount = 0;

	await new Promise(async (resolve) => {
		const server = await newHocuspocus();

		// Open a direct connection to get access to the document
		const direct = await server.openDirectConnection("test-doc");

		// Store reference to document before disconnect
		const document = direct.document!;

		// Track broadcasts by wrapping getConnections
		const originalGetConnections = document.getConnections.bind(document);
		document.getConnections = () => {
			if (document.isDestroyed) {
				broadcastCount++;
			}
			return originalGetConnections();
		};

		// Disconnect to trigger destroy
		await direct.disconnect();

		// Verify document is destroyed
		t.true(document.isDestroyed, "Document should be destroyed after disconnect");

		// Now try to transact on the destroyed document
		// This simulates async server-side logic continuing after client disconnect
		document.transact(() => {
			document.getMap("test").set("afterDestroy", "value");
		});

		// The broadcast should not have been attempted because listeners are removed
		// Note: With the fix, the 'update' event listener is removed, so handleUpdate
		// won't be called, and getConnections won't be invoked for broadcasting
		t.is(broadcastCount, 0, "No broadcasts should occur on destroyed document");

		resolve("done");
	});
});

test("awareness is destroyed when document is destroyed", async (t) => {
	await new Promise(async (resolve) => {
		const server = await newHocuspocus();

		const direct = await server.openDirectConnection("test-doc");
		const document = direct.document!;

		// Track awareness state before destroy
		const awarenessBeforeDestroy = document.awareness;

		// Verify awareness exists and is functional
		t.truthy(awarenessBeforeDestroy, "Awareness should exist before destroy");

		// Set some awareness state
		awarenessBeforeDestroy.setLocalState({ user: "test" });
		t.truthy(awarenessBeforeDestroy.getLocalState(), "Awareness state should be set");

		// Disconnect to trigger destroy
		await direct.disconnect();

		// After destroy, the awareness should be destroyed
		// The awareness.destroy() method clears local state
		t.is(
			awarenessBeforeDestroy.getLocalState(),
			null,
			"Awareness local state should be null after destroy"
		);

		resolve("done");
	});
});

test("event listeners are removed after destroy (prevents memory leak)", async (t) => {
	await new Promise(async (resolve) => {
		const server = await newHocuspocus();

		const direct = await server.openDirectConnection("test-doc");
		const document = direct.document!;

		// Track if update handler is called after destroy
		let handlerCalledAfterDestroy = false;

		// We can't directly check the internal _observers, but we can verify
		// behavior: after destroy, transact() should NOT trigger our handlers

		// Override the callbacks to detect if they're still being called
		const originalOnUpdate = document.callbacks.onUpdate;
		document.callbacks.onUpdate = (doc, connection, update) => {
			if (doc.isDestroyed) {
				handlerCalledAfterDestroy = true;
			}
			originalOnUpdate(doc, connection, update);
		};

		// Disconnect to trigger destroy
		await direct.disconnect();

		t.true(document.isDestroyed, "Document should be destroyed");

		// Try to trigger an update on the destroyed document
		// With the fix, the 'update' event listener is removed, so even if
		// transact emits an event, handleUpdate won't be called
		try {
			document.transact(() => {
				document.getMap("test").set("key", "value");
			});
		} catch {
			// Some Yjs versions might throw on destroyed doc, that's fine
		}

		// Give any async handlers time to run
		await sleep(50);

		// The callback should not have been called because:
		// 1. handleUpdate was removed from the 'update' event
		// 2. Even if somehow called, isDestroyed guard would prevent processing
		t.false(
			handlerCalledAfterDestroy,
			"Update callback should not be called after destroy"
		);

		resolve("done");
	});
});

test("simulates memory leak scenario: async operations after disconnect", async (t) => {
	/**
	 * This test simulates the real-world scenario that caused CPU runaway:
	 * 1. Client connects, document loads
	 * 2. Server starts async operation (e.g., AI processing) that will transact
	 * 3. Client disconnects before async operation completes
	 * 4. Document is destroyed
	 * 5. Async operation completes and tries to transact on destroyed document
	 *
	 * Before fix: Event handlers still fire, causing CPU waste
	 * After fix: Event handlers are removed, no CPU waste
	 */

	let asyncOperationTransactCalled = false;
	let updateHandlerCalledAfterDestroy = false;

	await new Promise(async (resolve) => {
		const server = await newHocuspocus({
			async afterLoadDocument({ document }) {
				// Simulate long-running async operation (like AI processing)
				// that will try to transact after the client disconnects
				setTimeout(() => {
					asyncOperationTransactCalled = true;
					if (document.isDestroyed) {
						// Track if update handler fires on destroyed document
						const originalOnUpdate = document.callbacks.onUpdate;
						document.callbacks.onUpdate = () => {
							updateHandlerCalledAfterDestroy = true;
							originalOnUpdate(document, null as any, new Uint8Array());
						};
					}

					// This simulates async server-side code transacting
					// on a document that may have been destroyed
					try {
						document.transact(() => {
							document.getMap("ai-results").set("completed", true);
						});
					} catch {
						// Expected if doc is destroyed
					}
				}, 200); // Will fire after client disconnects
			},
		});

		const provider = newHocuspocusProvider(server, {
			async onSynced() {
				// Client disconnects quickly (before async operation completes)
				await sleep(50);
				provider.configuration.websocketProvider.disconnect();
				provider.disconnect();
			},
		});

		// Wait for async operation to complete
		await sleep(400);

		t.true(asyncOperationTransactCalled, "Async operation should have run");
		t.false(
			updateHandlerCalledAfterDestroy,
			"Update handler should NOT fire on destroyed document"
		);

		resolve("done");
	});
});
