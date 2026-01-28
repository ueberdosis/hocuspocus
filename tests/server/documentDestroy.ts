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
	 * called when transacting AFTER destroy completes.
	 *
	 * Without fix: handleUpdate still fires → getConnections() called
	 * With fix: handleUpdate removed → getConnections() not called
	 */
	let getConnectionsCallsAfterDestroy = 0;

	await new Promise(async (resolve) => {
		const server = await newHocuspocus();

		const direct = await server.openDirectConnection("test-doc");
		const document = direct.document!;

		// Disconnect triggers destroy
		await direct.disconnect();
		t.true(document.isDestroyed, "Document should be destroyed");

		// Wrap getConnections AFTER destroy completes to only count post-destroy calls
		const originalGetConnections = document.getConnections.bind(document);
		document.getConnections = () => {
			getConnectionsCallsAfterDestroy++;
			return originalGetConnections();
		};

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

		// Disconnect triggers destroy
		await direct.disconnect();
		t.true(document.isDestroyed, "Document should be destroyed");

		// Wrap getConnections AFTER destroy completes to only count post-destroy calls
		const originalGetConnections = document.getConnections.bind(document);
		document.getConnections = () => {
			getConnectionsCallsAfterDestroy++;
			return originalGetConnections();
		};

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
	let destroyComplete = false;

	await new Promise(async (resolve) => {
		const server = await newHocuspocus({
			async afterLoadDocument({ document }) {
				documentRef = document;

				// Simulate async operation that will complete after disconnect
				setTimeout(() => {
					// Only count calls after destroy is complete
					if (destroyComplete && document.isDestroyed) {
						// Wrap getConnections to detect post-destroy calls
						const originalGetConnections = document.getConnections.bind(document);
						document.getConnections = () => {
							getConnectionsCallsAfterDestroy++;
							return originalGetConnections();
						};

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

		// Wait for disconnect to complete and document to be destroyed
		await sleep(150);
		destroyComplete = true;

		// Wait for async operation to complete
		await sleep(300);

		t.true(documentRef.isDestroyed, "Document should be destroyed");
		t.is(
			getConnectionsCallsAfterDestroy,
			0,
			"Async transact on destroyed document should NOT trigger handlers"
		);

		resolve("done");
	});
});
