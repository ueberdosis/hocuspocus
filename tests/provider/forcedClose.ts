import type { onCloseParameters } from "@hocuspocus/provider";
import test from "ava";
import { newHocuspocus, newHocuspocusProvider } from "../utils/index.ts";

// A WebSocket that can go silent, like a connection a proxy dropped
// without a close frame: no message or close event reaches the provider.
class SilentWebSocket extends WebSocket {
	static created: SilentWebSocket[] = [];

	silent = false;

	wrappers = new Map<EventListenerOrEventListenerObject, EventListener>();

	constructor(url: string | URL) {
		super(url);
		SilentWebSocket.created.push(this);
	}

	addEventListener(type: string, listener: any) {
		const wrapper = (event: Event) => {
			if (this.silent && (type === "message" || type === "close")) {
				return;
			}
			listener(event);
		};
		this.wrappers.set(listener, wrapper);
		super.addEventListener(type, wrapper);
	}

	removeEventListener(type: string, listener: any) {
		super.removeEventListener(type, this.wrappers.get(listener) ?? listener);
	}
}

test("a forced close after missed messages resets synced and syncs again", async (t) => {
	SilentWebSocket.created = [];
	const server = await newHocuspocus(t);

	const provider = newHocuspocusProvider(
		t,
		server,
		{},
		{
			WebSocketPolyfill: SilentWebSocket,
			messageReconnectTimeout: 100,
			delay: 10,
			minDelay: 10,
			initialDelay: 0,
			jitter: false,
		},
	);

	const nextSynced = () =>
		new Promise((resolve) => {
			const onSynced = () => {
				provider.off("synced", onSynced);
				resolve(SilentWebSocket.created.length);
			};
			provider.on("synced", onSynced);
		});

	await nextSynced();
	SilentWebSocket.created[0].silent = true;

	const forcedClose = new Promise<boolean>((resolve) => {
		provider.on("close", ({ event }: onCloseParameters) => {
			if (event.code === 4408) {
				resolve(provider.synced);
			}
		});
	});
	const syncedAgain = nextSynced();
	const timeout = new Promise((resolve) =>
		setTimeout(resolve, 3000, "timeout"),
	);

	const syncedAfterForcedClose = await Promise.race([forcedClose, timeout]);
	t.false(
		syncedAfterForcedClose,
		"provider stays synced after the forced close",
	);
	t.is(
		await Promise.race([syncedAgain, timeout]),
		2,
		"no synced event on the first reconnect",
	);
});
