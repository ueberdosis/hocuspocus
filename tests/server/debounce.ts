import { useDebounce } from "@hocuspocus/server";
import test from "ava";
import { sleep } from "../utils/index.ts";

test("maxDebounce does not queue an execution per call while a slow execution is in flight", async (t) => {
	const { debounce } = useDebounce();

	let executions = 0;
	const func = async () => {
		executions += 1;
		// the first execution is slower than maxDebounce, simulating a
		// database/S3 latency spike during a store
		await sleep(executions === 1 ? 500 : 10);
	};

	// Continuous calls, like a busy collaborative document: each call resets
	// the debounce timeout, so only the maxDebounce branch triggers executions
	// (at most one per 200ms).
	const end = Date.now() + 1_000;
	while (Date.now() < end) {
		debounce("doc", func, 50, 200);
		await sleep(20);
	}
	await sleep(600); // let in-flight and queued executions finish

	// ~1s of continuous calls with maxDebounce=200 should execute ~5 times.
	// If run() suspends on the in-flight execution before deleting the timer
	// entry, the stale entry keeps satisfying the maxDebounce age check and
	// every call during the slow execution queues another run (~25 executions).
	t.true(executions <= 8, `executed ${executions} times, expected ~5`);
});
