import test from "ava";
import {
	newHocuspocus,
	newHocuspocusProvider,
	waitForSynced,
} from "../utils/index.ts";

// What the HTTP transports take from a browser. Here: the page a relative
// URL is relative to. `location` is set for the whole process, which is why
// these tests have a file of their own.

test("sse: a relative URL is resolved against the page, as a WebSocket does", async (t) => {
	const hocuspocus = await newHocuspocus(t, { httpFallback: true });
	Object.assign(globalThis, {
		location: { href: `${hocuspocus.server!.httpURL}/editor/42?tab=1` },
	});
	const provider = newHocuspocusProvider(
		t,
		hocuspocus,
		{},
		{ url: "/collaboration", transports: ["sse"] },
	);

	await waitForSynced(provider);
	t.is(provider.configuration.websocketProvider.transport, "sse");
});
