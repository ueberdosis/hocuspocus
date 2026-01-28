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

test("handleUpdate listener is removed after destroy - getConnections not called", async (t) => {
	/**
	 * This test verifies that the 'update' event listener (handleUpdate) is removed
	 * when destroy() is called. We detect this by checking if getConnections() is
	 * called, since handleUpdate calls getConnections() to broadcast updates.
	 *
	 * Without fix: handleUpdate still fires → getConnections() called → broadcastCount > 0
	 * With fix: handleUpdate removed → getConnections() not called → broadcastCount = 0
	 */
	let getConnectionsCallsAfterDestroy = 0;

	await new Promise(async (resolve) => {
		const server = await newHocuspocus();

		const direct = await server.openDirectConnection("test-doc");
		const document = direct.document!;

		// Wrap getConnections to detect calls after destroy
		const originalGetConnections = document.getConnections.bind(document);
		document.getConnections = () => {
			if (document.isDestroyed) {
				getConnectionsCallsAfterDestroy++;
			}
			return originalGetConnections();
		};

		// Disconnect triggers destroy
		await direct.disconnect();
		t.true(document.isDestroyed, "Document should be destroyed");

		// Transact on destroyed document - this emits 'update' event
		document.transact(() => {
			document.getMap("test").set("key", "value");
		});

		t.is(
			getConnectionsCallsAfterDestroy,
			0,
			"getConnections should NOT be called after destroy (handleUpdate should be removed)"
		);

		resolve("done");
	});
});

test("awareness update listener is removed after destroy", async (t) => {
	/**
	 * This test verifies that the awareness 'update' listener (handleAwarenessUpdate)
	 * is removed when destroy() is called.
	 *
	 * handleAwarenessUpdate calls getConnections() to broadcast awareness updates.
	 *
	 * Without fix: awareness listener still fires → getConnections called
	 * With fix: awareness listener removed → getConnections not called
	 */
	let getConnectionsCallsAfterDestroy = 0;

	await new Promise(async (resolve) => {
		const server = await newHocuspocus();

		const direct = await server.openDirectConnection("test-doc");
		const document = direct.document!;

		// Wrap getConnections to detect calls from awareness handler
		const originalGetConnections = document.getConnections.bind(document);
		document.getConnections = () => {
			if (document.isDestroyed) {
				getConnectionsCallsAfterDestroy++;
			}
			return originalGetConnections();
		};

		// Disconnect triggers destroy
		await direct.disconnect();
		t.true(document.isDestroyed, "Document should be destroyed");

		// Trigger awareness update on destroyed document
		document.awareness.setLocalState({ user: "test-after-destroy" });

		t.is(
			getConnectionsCallsAfterDestroy,
			0,
			"getConnections should NOT be called for awareness updates after destroy"
		);

		resolve("done");
	});
});

test("async operations after disconnect do not trigger handlers on destroyed document", async (t) => {
	/**
	 * Real-world scenario simulation:
	 * 1. Client connects, document loads
	 * 2. Server starts async operation (e.g., AI processing)
	 * 3. Client disconnects before async operation completes
	 * 4. Document is destroyed
	 * 5. Async operation completes and calls transact() on destroyed document
	 *
	 * Without fix: handleUpdate fires, getConnections called, CPU wasted
	 * With fix: handleUpdate removed, no processing occurs
	 */
	let getConnectionsCallsAfterDestroy = 0;
	let documentRef: any = null;

	await new Promise(async (resolve) => {
		const server = await newHocuspocus({
			async afterLoadDocument({ document }) {
				documentRef = document;

				// Wrap getConnections before any async operations
				const originalGetConnections = document.getConnections.bind(document);
				document.getConnections = () => {
					if (document.isDestroyed) {
						getConnectionsCallsAfterDestroy++;
					}
					return originalGetConnections();
				};

				// Simulate async operation that will complete after disconnect
				setTimeout(() => {
					// This runs after document is destroyed
					if (document.isDestroyed) {
						// Try to transact on destroyed document
						document.transact(() => {
							document.getMap("ai-results").set("completed", true);
						});
					}
				}, 200);
			},
		});

		const provider = newHocuspocusProvider(server, {
			async onSynced() {
				// Client disconnects quickly (before async operation completes)
				await sleep(50);
				provider.configuration.websocketProvider.disconnect();
			},
		});

		// Wait for async operation to complete
		await sleep(400);

		t.true(documentRef.isDestroyed, "Document should be destroyed");
		t.is(
			getConnectionsCallsAfterDestroy,
			0,
			"Async transact on destroyed document should NOT trigger handlers"
		);

		resolve("done");
	});
});
