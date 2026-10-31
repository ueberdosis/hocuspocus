import test from "ava";
// @ts-expect-error -- ws ships no type declarations; used only as a raw client.
import WebSocket from "ws";
import { newHocuspocus } from "../utils/index.ts";

// crossws vendors its own copy of ws, and the CJS build inlines crossws, so the
// ws options available depend on the crossws version we build with. ws 8.21.0
// added `maxFragments`; the receiver closes a connection with 1008 once a
// message exceeds it.
const sendFragmentsUntilClosed = (url: string, count: number) =>
	new Promise<number>((resolve, reject) => {
		const socket = new WebSocket(url);
		socket.on("error", () => {});
		socket.on("close", (code: number) => resolve(code));
		socket.on("open", () => {
			const fragment = Buffer.from([0]);
			for (let i = 0; i < count; i += 1) {
				socket.send(fragment, { binary: true, fin: false });
			}
		});
		setTimeout(() => {
			socket.terminate();
			reject(new Error(`connection still open after ${count} fragments`));
		}, 10_000);
	});

test("closes a connection that sends too many fragments", async (t) => {
	const hocuspocus = await newHocuspocus(t);

	// ws defaults to `maxFragments: 16384`.
	const code = await sendFragmentsUntilClosed(
		hocuspocus.server!.webSocketURL,
		20_000,
	);

	t.is(code, 1008);
});

test("passes maxFragments from websocketOptions to the receiver", async (t) => {
	const hocuspocus = await newHocuspocus(t, {
		websocketOptions: { maxFragments: 8 },
	});

	const code = await sendFragmentsUntilClosed(
		hocuspocus.server!.webSocketURL,
		9,
	);

	t.is(code, 1008);
});
