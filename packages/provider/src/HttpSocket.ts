import {
	HTTP_TRANSPORT_PROBE,
	HttpTransportEvent,
	type HttpTransportName,
	type HttpTransportOpenPayload,
	HttpTransportParameter,
	WsReadyStates,
} from "@hocuspocus/common";
import { fromBase64, toBase64 } from "lib0/buffer";
import { uuidv4 } from "lib0/random";

const RETRY_BASE_DELAY = 250;
const RETRY_MAX_DELAY = 5_000;

// Browsers cap the bodies of all in-flight keepalive requests at 64 KiB.
const KEEPALIVE_MAX_BODY = 60_000;

type Listener = (event: unknown) => void;

type StreamItem =
	| { comment: string }
	| { event: string | null; id: string | null; data: string | null };

interface RetryState {
	failingSince: number | null;
	attempt: number;
}

interface PendingPost {
	/** Batch sequence number, null for a ping. */
	seq: number | null;
	body: string;
}

/** A request the server answered with a status that ends the socket. */
class StatusError extends Error {}

/**
 * Parse `text/event-stream` text that arrives in arbitrary chunks. Comments
 * and events are reported in order; an incomplete block waits for the next
 * chunk.
 */
function createEventStreamParser(
	onItem: (item: StreamItem) => void,
): (text: string) => void {
	let buffer = "";
	let searchFrom = 0;

	return (text) => {
		buffer += text;
		let end = buffer.indexOf("\n\n", searchFrom);
		while (end !== -1) {
			const block = buffer.slice(0, end);
			buffer = buffer.slice(end + 2);

			let event: string | null = null;
			let id: string | null = null;
			let data: string | null = null;
			let hasField = false;
			for (const rawLine of block.split("\n")) {
				const line = rawLine.endsWith("\r") ? rawLine.slice(0, -1) : rawLine;
				if (line.startsWith(":")) {
					onItem({ comment: line.slice(1) });
					continue;
				}

				const colon = line.indexOf(":");
				const field = colon === -1 ? line : line.slice(0, colon);
				let value = colon === -1 ? "" : line.slice(colon + 1);
				if (value.startsWith(" ")) {
					value = value.slice(1);
				}

				if (field === "event") {
					event = value;
					hasField = true;
				} else if (field === "id") {
					id = value;
					hasField = true;
				} else if (field === "data") {
					data = data === null ? value : `${data}\n${value}`;
					hasField = true;
				}
			}
			if (hasField) {
				onItem({ event, id, data });
			}

			end = buffer.indexOf("\n\n");
		}
		// A block separator may straddle two chunks.
		searchFrom = Math.max(0, buffer.length - 1);
	};
}

function parseCloseEvent(text: string): { code: number; reason: string } {
	try {
		const { code, reason } = JSON.parse(text);
		if (typeof code === "number") {
			return { code, reason: typeof reason === "string" ? reason : "" };
		}
	} catch {
		// Fall through.
	}
	return { code: 1006, reason: "Invalid close event" };
}

/**
 * Client side of the HTTP fallback transports of `@hocuspocus/server`
 * (`HttpFallback`): server-sent events or long-polling downstream, POST
 * upstream. Presents the subset of the browser `WebSocket` that
 * `HocuspocusProviderWebsocket` uses.
 *
 * Uses `fetch` with a stream reader instead of `EventSource`, which cannot
 * POST, hides the status code and is not a global in Node.js.
 */
export class HttpSocket {
	binaryType = "arraybuffer";

	identifier = 0;

	readyState: number = WsReadyStates.Connecting;

	private readonly transport: HttpTransportName;

	private readonly connectTimeout: number;

	private readonly sessionId = uuidv4();

	private readonly listeners = new Map<string, Set<Listener>>();

	private readonly controllers = new Set<AbortController>();

	private readonly timers = new Set<ReturnType<typeof setTimeout>>();

	// Assigned in the constructor; a socket without it never sends a request.
	private baseUrl!: URL;

	private key: string | null = null;

	private heartbeatInterval = 0;

	private maxPayload = 0;

	/** Highest downstream message id processed. */
	private cursor = 0;

	/** Sequence number of the last batch the server accepted. */
	private sendSeq = 0;

	private queue: string[] = [];

	private flushScheduled = false;

	private pendingPost: PendingPost | null = null;

	private upstreamBusy = false;

	private pingWanted = false;

	private readonly downstreamRetry: RetryState = {
		failingSince: null,
		attempt: 0,
	};

	private readonly upstreamRetry: RetryState = {
		failingSince: null,
		attempt: 0,
	};

	private finished = false;

	constructor(
		url: string,
		options: { transport: HttpTransportName; connectTimeout: number },
	) {
		this.transport = options.transport;
		this.connectTimeout = options.connectTimeout;

		try {
			if (typeof fetch !== "function") {
				throw new Error("fetch is not available");
			}
			this.baseUrl = new URL(url.replace(/^ws/i, "http"));
		} catch (error) {
			this.finish(1006, error instanceof Error ? error.message : String(error), true);
			return;
		}

		if (this.transport === "sse") {
			void this.attachEventStream();
		} else {
			void this.openPolling();
		}
	}

	addEventListener(type: string, listener: Listener): void {
		let listeners = this.listeners.get(type);
		if (!listeners) {
			listeners = new Set();
			this.listeners.set(type, listeners);
		}
		listeners.add(listener);
	}

	removeEventListener(type: string, listener: Listener): void {
		this.listeners.get(type)?.delete(listener);
	}

	send(data: Uint8Array | ArrayBuffer): void {
		if (this.readyState !== WsReadyStates.Open) {
			return;
		}

		this.queue.push(
			toBase64(data instanceof Uint8Array ? data : new Uint8Array(data)),
		);

		if (!this.flushScheduled) {
			this.flushScheduled = true;
			queueMicrotask(() => {
				this.flushScheduled = false;
				this.pumpUpstream();
			});
		}
	}

	close(code?: number, reason?: string): void {
		this.finish(code ?? 1005, reason ?? "", true);
	}

	private dispatch(type: string, event: unknown): void {
		const listeners = this.listeners.get(type);
		if (!listeners) {
			return;
		}
		for (const listener of [...listeners]) {
			// A listener removed by an earlier one is not called anymore.
			if (listeners.has(listener)) {
				listener(event);
			}
		}
	}

	private setTimer(callback: () => void, delay: number) {
		const timer = setTimeout(() => {
			this.timers.delete(timer);
			callback();
		}, delay);
		this.timers.add(timer);
		return timer;
	}

	private clearTimer(timer: ReturnType<typeof setTimeout> | undefined): void {
		if (timer !== undefined) {
			clearTimeout(timer);
			this.timers.delete(timer);
		}
	}

	private requestUrl(parameters: Record<string, string>): URL {
		const url = new URL(this.baseUrl);
		url.searchParams.set(HttpTransportParameter.SessionId, this.sessionId);
		for (const [name, value] of Object.entries(parameters)) {
			url.searchParams.set(name, value);
		}
		return url;
	}

	/**
	 * End the socket once: abort every request, optionally tell the server, then
	 * dispatch `error` (only for a socket that failed to open) and `close`.
	 */
	private finish(code: number, reason: string, notifyServer: boolean): void {
		if (this.finished) {
			return;
		}
		this.finished = true;

		const wasConnecting = this.readyState === WsReadyStates.Connecting;
		this.readyState = WsReadyStates.Closed;

		for (const controller of this.controllers) {
			controller.abort();
		}
		this.controllers.clear();
		for (const timer of this.timers) {
			clearTimeout(timer);
		}
		this.timers.clear();

		if (notifyServer && this.key !== null) {
			fetch(this.requestUrl({ [HttpTransportParameter.Close]: "1" }), {
				method: "POST",
				body: this.key,
				keepalive: true,
			}).catch(() => {});
		}

		queueMicrotask(() => {
			if (wasConnecting && code === 1006) {
				this.dispatch("error", new Error(reason));
			}
			this.dispatch("close", { type: "close", code, reason });
		});
	}

	/**
	 * Delay before the next attempt of a failed request, or null once failures
	 * have lasted `connectTimeout`.
	 */
	private nextRetryDelay(state: RetryState): number | null {
		const now = Date.now();
		if (state.failingSince === null) {
			state.failingSince = now;
		} else if (now - state.failingSince >= this.connectTimeout) {
			return null;
		}

		const delay =
			Math.random() *
			Math.min(RETRY_MAX_DELAY, RETRY_BASE_DELAY * 2 ** state.attempt);
		state.attempt += 1;
		return delay;
	}

	private resetRetry(state: RetryState): void {
		state.failingSince = null;
		state.attempt = 0;
	}

	/**
	 * Apply the status of a request made after open. Throws a `StatusError`
	 * after ending the socket for a 4xx; returns for 2xx; throws a plain error
	 * (retried) otherwise.
	 */
	private async checkStatus(response: Response, expected: number): Promise<void> {
		const { status } = response;
		if (status === expected) {
			return;
		}

		if (status === 404) {
			this.finish(1006, "Session not found", false);
		} else if (status === 410) {
			const { code, reason } = parseCloseEvent(
				await response.text().catch(() => ""),
			);
			this.finish(code, reason, false);
		} else if (status === 413) {
			this.finish(1009, "Message Too Big", true);
		} else if (status >= 400 && status < 500) {
			this.finish(1006, `Unexpected status ${status}`, true);
		} else {
			throw new Error(`Unexpected status ${status}`);
		}

		throw new StatusError(`Status ${status}`);
	}

	private open(): void {
		this.readyState = WsReadyStates.Open;
		this.dispatch("open", { type: "open" });
	}

	private readOpenPayload(data: string | null): void {
		const payload: Partial<HttpTransportOpenPayload> = JSON.parse(
			data ?? "null",
		) ?? {};
		const { key, heartbeatInterval, maxPayload } = payload;
		if (
			typeof key !== "string" ||
			key === "" ||
			typeof heartbeatInterval !== "number" ||
			!Number.isFinite(heartbeatInterval) ||
			heartbeatInterval <= 0 ||
			typeof maxPayload !== "number" ||
			!Number.isFinite(maxPayload) ||
			maxPayload <= 0
		) {
			throw new Error("Invalid open event");
		}

		this.key = key;
		this.heartbeatInterval = heartbeatInterval;
		this.maxPayload = maxPayload;
	}

	/**
	 * Handle one item of a downstream body. Throws when the stream is invalid;
	 * the caller fails the request.
	 */
	private handleItem(item: StreamItem): void {
		if (this.finished) {
			return;
		}

		if ("comment" in item) {
			return;
		}

		if (item.event === HttpTransportEvent.Open) {
			if (this.key === null) {
				this.readOpenPayload(item.data);
			}
			return;
		}

		if (item.event === HttpTransportEvent.Close) {
			const { code, reason } = parseCloseEvent(item.data ?? "");
			this.finish(code, reason, false);
			return;
		}

		if (
			item.event !== null ||
			item.id === null ||
			item.data === null ||
			this.readyState !== WsReadyStates.Open
		) {
			return;
		}

		const id = Number(item.id);
		// Replay of a message already processed.
		if (!(id > this.cursor)) {
			return;
		}

		let data: Uint8Array;
		try {
			data = fromBase64(item.data);
		} catch {
			this.finish(1006, "Invalid message", true);
			return;
		}

		this.cursor = id;
		this.dispatch("message", { type: "message", data: data.buffer });
	}

	/**
	 * Open (first call) or resume (later calls) the event stream. The socket
	 * opens once the stream delivered both the open event and the probe
	 * comment, which proves that the path does not buffer the response.
	 */
	private async attachEventStream(): Promise<void> {
		const opening = this.key === null;
		const controller = new AbortController();
		this.controllers.add(controller);
		const deadline = this.setTimer(
			() => controller.abort(),
			this.connectTimeout,
		);
		let silence: ReturnType<typeof setTimeout> | undefined;
		let probed = false;

		const parse = createEventStreamParser((item) => {
			if (this.finished) {
				return;
			}

			if ("comment" in item && item.comment === HTTP_TRANSPORT_PROBE) {
				probed = true;
				this.clearTimer(deadline);
				this.resetRetry(this.downstreamRetry);
				if (this.readyState === WsReadyStates.Connecting) {
					if (this.key === null) {
						throw new Error("Event stream did not open a session");
					}
					this.open();
				}
				return;
			}

			if ("comment" in item && item.comment === "") {
				this.requestPing();
				return;
			}

			this.handleItem(item);
		});

		try {
			const response = await fetch(
				this.requestUrl(
					opening
						? { [HttpTransportParameter.Transport]: "sse" }
						: {
								[HttpTransportParameter.Transport]: "sse",
								[HttpTransportParameter.Cursor]: String(this.cursor),
							},
				),
				opening
					? { signal: controller.signal }
					: {
							method: "POST",
							body: this.key as string,
							signal: controller.signal,
						},
			);
			if (this.finished) {
				return;
			}

			if (!opening) {
				await this.checkStatus(response, 200);
			}
			if (
				response.status !== 200 ||
				!response.body ||
				!response.headers.get("content-type")?.startsWith("text/event-stream")
			) {
				throw new Error(`Unexpected event stream response (${response.status})`);
			}

			const reader = response.body.getReader();
			const decoder = new TextDecoder();
			while (true) {
				const { done, value } = await reader.read();
				if (this.finished) {
					return;
				}
				if (done) {
					throw new Error("Event stream ended");
				}

				parse(decoder.decode(value, { stream: true }));

				if (probed && !this.finished) {
					this.clearTimer(silence);
					silence = this.setTimer(
						() => controller.abort(),
						this.heartbeatInterval + this.connectTimeout,
					);
				}
			}
		} catch (error) {
			if (this.finished || error instanceof StatusError) {
				return;
			}

			const reason = error instanceof Error ? error.message : String(error);
			if (this.readyState === WsReadyStates.Connecting) {
				this.finish(1006, reason, true);
				return;
			}

			const delay = this.nextRetryDelay(this.downstreamRetry);
			if (delay === null) {
				this.finish(1006, reason, true);
				return;
			}
			this.setTimer(() => this.attachEventStream(), delay);
		} finally {
			this.clearTimer(deadline);
			this.clearTimer(silence);
			controller.abort();
			this.controllers.delete(controller);
		}
	}

	private async openPolling(): Promise<void> {
		const controller = new AbortController();
		this.controllers.add(controller);
		const deadline = this.setTimer(
			() => controller.abort(),
			this.connectTimeout,
		);

		try {
			const response = await fetch(
				this.requestUrl({ [HttpTransportParameter.Transport]: "polling" }),
				{ signal: controller.signal },
			);
			if (this.finished) {
				return;
			}
			if (response.status !== 200) {
				throw new Error(`Unexpected status ${response.status}`);
			}

			const text = await response.text();
			if (this.finished) {
				return;
			}

			createEventStreamParser((item) => {
				this.handleItem(item);
				if (
					!this.finished &&
					this.key !== null &&
					this.readyState === WsReadyStates.Connecting
				) {
					this.open();
				}
			})(text);

			if (this.finished) {
				return;
			}
			if (this.key === null) {
				throw new Error("Poll did not open a session");
			}
		} catch (error) {
			this.finish(
				1006,
				error instanceof Error ? error.message : String(error),
				true,
			);
			return;
		} finally {
			this.clearTimer(deadline);
			controller.abort();
			this.controllers.delete(controller);
		}

		void this.poll();
	}

	private async poll(): Promise<void> {
		const controller = new AbortController();
		this.controllers.add(controller);
		const deadline = this.setTimer(
			() => controller.abort(),
			this.heartbeatInterval + this.connectTimeout,
		);

		try {
			const response = await fetch(
				this.requestUrl({
					[HttpTransportParameter.Transport]: "polling",
					[HttpTransportParameter.Cursor]: String(this.cursor),
				}),
				{
					method: "POST",
					body: this.key as string,
					signal: controller.signal,
				},
			);
			if (this.finished) {
				return;
			}
			await this.checkStatus(response, 200);

			const text = await response.text();
			if (this.finished) {
				return;
			}

			this.resetRetry(this.downstreamRetry);
			createEventStreamParser((item) => this.handleItem(item))(text);
		} catch (error) {
			if (this.finished || error instanceof StatusError) {
				return;
			}

			const delay = this.nextRetryDelay(this.downstreamRetry);
			if (delay === null) {
				this.finish(
					1006,
					error instanceof Error ? error.message : String(error),
					true,
				);
				return;
			}
			this.setTimer(() => this.poll(), delay);
			return;
		} finally {
			this.clearTimer(deadline);
			controller.abort();
			this.controllers.delete(controller);
		}

		if (!this.finished) {
			void this.poll();
		}
	}

	/**
	 * Acknowledge and prove liveness after a heartbeat, unless a POST is in
	 * flight: that POST is the same proof.
	 */
	private requestPing(): void {
		if (this.upstreamBusy || this.readyState !== WsReadyStates.Open) {
			return;
		}
		this.pingWanted = true;
		this.pumpUpstream();
	}

	/**
	 * Start the next POST: the batch that failed, else queued messages, else a
	 * requested ping. One POST is in flight at a time.
	 */
	private pumpUpstream(): void {
		if (
			this.finished ||
			this.upstreamBusy ||
			this.readyState !== WsReadyStates.Open
		) {
			return;
		}

		const key = this.key as string;

		if (!this.pendingPost) {
			if (this.queue.length > 0) {
				let length = key.length;
				let count = 0;
				for (const line of this.queue) {
					if (length + 1 + line.length > this.maxPayload) {
						break;
					}
					length += 1 + line.length;
					count += 1;
				}
				if (count === 0) {
					this.finish(1009, "Message Too Big", true);
					return;
				}

				const lines = this.queue.splice(0, count);
				this.pendingPost = {
					seq: this.sendSeq + 1,
					body: [key, ...lines].join("\n"),
				};
			} else if (this.pingWanted) {
				this.pendingPost = { seq: null, body: key };
			} else {
				return;
			}
			this.pingWanted = false;
		}

		this.upstreamBusy = true;
		void this.post(this.pendingPost);
	}

	private async post(pending: PendingPost): Promise<void> {
		const controller = new AbortController();
		this.controllers.add(controller);
		const deadline = this.setTimer(
			() => controller.abort(),
			this.connectTimeout,
		);

		const parameters: Record<string, string> = {
			[HttpTransportParameter.Cursor]: String(this.cursor),
		};
		if (pending.seq !== null) {
			parameters[HttpTransportParameter.Sequence] = String(pending.seq);
		}

		try {
			const response = await fetch(this.requestUrl(parameters), {
				method: "POST",
				body: pending.body,
				keepalive: pending.body.length <= KEEPALIVE_MAX_BODY,
				signal: controller.signal,
			});
			if (this.finished) {
				return;
			}
			await this.checkStatus(response, 204);
		} catch (error) {
			if (this.finished || error instanceof StatusError) {
				return;
			}

			const delay = this.nextRetryDelay(this.upstreamRetry);
			if (delay === null) {
				this.finish(
					1006,
					error instanceof Error ? error.message : String(error),
					true,
				);
				return;
			}
			// Retry the identical batch: the server drops a duplicate sequence
			// number, so every batch is processed exactly once.
			this.setTimer(() => {
				this.upstreamBusy = false;
				this.pumpUpstream();
			}, delay);
			return;
		} finally {
			this.clearTimer(deadline);
			controller.abort();
			this.controllers.delete(controller);
		}

		if (pending.seq !== null) {
			this.sendSeq = pending.seq;
		}
		this.pendingPost = null;
		this.resetRetry(this.upstreamRetry);
		this.upstreamBusy = false;
		this.pumpUpstream();
	}
}
