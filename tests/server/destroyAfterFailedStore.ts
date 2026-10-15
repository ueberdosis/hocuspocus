import type { Hocuspocus } from "@hocuspocus/server";
import test, { type ExecutionContext } from "ava";
import { newHocuspocus, newHocuspocusProvider, sleep } from "../utils/index.ts";

// Edits a document and closes the only connection, so the server stores the document right away.
async function editAndLeave(t: ExecutionContext, server: Hocuspocus) {
	const provider = newHocuspocusProvider(t, server, {
		name: `test-${crypto.randomUUID()}`,
	});

	await new Promise<void>((resolve) => provider.on("synced", () => resolve()));

	provider.document.getArray("foo").insert(0, ["bar"]);
	await sleep(100);

	provider.configuration.websocketProvider.destroy();
}

async function finishesWithin(milliseconds: number, work: Promise<void>) {
	const finished = work.then(() => true);
	const timedOut = sleep(milliseconds).then(() => false);

	return Promise.race([finished, timedOut]);
}

test("destroy stores a document whose last store failed", async (t) => {
	const storedContents: string[] = [];
	let storeAttempts = 0;

	const server = await newHocuspocus(t, {
		async onStoreDocument({ document }) {
			storeAttempts += 1;

			if (storeAttempts === 1) {
				throw new Error("storage is unavailable");
			}

			storedContents.push(document.getArray<string>("foo").toArray().join());
		},
	});

	await editAndLeave(t, server);

	while (storeAttempts === 0) {
		await sleep(50);
	}

	t.true(await finishesWithin(5000, server.server!.destroy()));
	t.deepEqual(storedContents, ["bar"]);
});

test("destroy finishes when a document cannot be stored", async (t) => {
	let storeAttempts = 0;

	const server = await newHocuspocus(t, {
		async onStoreDocument() {
			storeAttempts += 1;
			throw new Error("storage is unavailable");
		},
	});

	await editAndLeave(t, server);

	while (storeAttempts === 0) {
		await sleep(50);
	}

	t.true(await finishesWithin(5000, server.server!.destroy()));
	t.is(server.getDocumentsCount(), 0);
});
