import {
	type CloseEvent,
	ConnectionTimeout,
	HTTP_TRANSPORT_PROBE,
	HttpTransportEvent,
	type HttpTransportName,
	type HttpTransportOpenPayload,
	WsReadyStates,
} from "@hocuspocus/common";
import { fromBase64, toBase64 } from "lib0/buffer";
import type { ClientConnection } from "./ClientConnection.ts";
import type { WebSocketLike } from "./types.ts";

// Written first on every event stream, so proxies that buffer small responses
// flush the headers and the stream starts moving.
const SSE_PADDING = `:${" ".repeat(2048)}\n\n`;

// Delay of the probe comment after an event stream starts. A client only
// opens once the probe arrived, which proves the path delivers data written
// after the first chunk while the response is still open.
const SSE_PROBE_DELAY = 50;

const PROBE = `:${HTTP_TRANSPORT_PROBE}\n\n`;

const HEARTBEAT = ":\n\n";

const textEncoder = new TextEncoder();

// `Document.broadcast` hands the same buffer to every connection, so a
// broadcast is encoded once, not once per session.
const encodedMessages = new WeakMap<Uint8Array, string>();

function encodeMessage(data: Parameters<WebSocketLike["send"]>[0]): string {
	if (data instanceof Uint8Array) {
		let encoded = encodedMessages.get(data);
		if (encoded === undefined) {
			encoded = toBase64(data);
			encodedMessages.set(data, encoded);
		}
		return encoded;
	}

	if (ArrayBuffer.isView(data)) {
		return toBase64(
			new Uint8Array(data.buffer, data.byteOffset, data.byteLength),
		);
	}
	if (data instanceof ArrayBuffer) {
		return toBase64(new Uint8Array(data));
	}
	throw new TypeError("HttpFallback only sends binary messages");
}

export interface HttpFallbackSessionOptions {
	/** The secret that authorises the requests of the session. */
	key: string;
	/**
	 * Interval of the heartbeats on an event stream and longest time a poll is
	 * held, in ms.
	 */
	heartbeat: number;
	/** Largest POST body the server accepts; the client is told on open. */
	maxPayload: number;
	/** How long a message may wait for its acknowledgement, in ms. */
	timeout: number;
	/** Hands the session to Hocuspocus, as the socket of a new connection. */
	connect: (socket: WebSocketLike) => ClientConnection;
	/**
	 * Called once when the session closes: with the close event if the server
	 * closed it and the client still has to learn why, with null if the client
	 * closed it.
	 */
	onClose: (closeEvent: CloseEvent | null) => void;
}

/** A response that carries messages to the client. */
interface Downstream {
	mode: HttpTransportName;
	controller: ReadableStreamDefaultController<Uint8Array>;
	/** Event stream: writes the probe. Poll: ends the hold. */
	timeout?: ReturnType<typeof setTimeout>;
	/** Event stream: writes the heartbeats. */
	interval?: ReturnType<typeof setInterval>;
}

/**
 * One client of the HTTP fallback transports, presented to Hocuspocus as a
 * WebSocket.
 *
 * Downstream, messages are numbered from 1 and stay in the outbox until the
 * client acknowledges them: the cursor of a request is the highest id the
 * client has processed. A downstream response starts after the cursor of its
 * request, so what a cut event stream or a lost poll response carried is
 * written again.
 *
 * Upstream, the client numbers its batches of messages. A batch that arrives
 * again, because its response got lost, is not processed twice.
 */
export class HttpFallbackSession implements WebSocketLike {
	readonly key: string;

	readyState: number = WsReadyStates.Open;

	readonly clientConnection: ClientConnection;

	// The messages the client has not acknowledged, base64 encoded and oldest
	// first: `outbox[i]` has the id `acked + 1 + i` and waits since
	// `queuedAt[i]`. Two arrays rather than one of objects, because a client
	// that only listens acknowledges once per heartbeat: hundreds of messages
	// can wait per session.
	private outbox: string[] = [];

	private queuedAt: number[] = [];

	/** Highest message id the client has acknowledged. */
	private acked = 0;

	/** Highest message id written to the current downstream. */
	private written = 0;

	/** Sequence number of the last batch received from the client. */
	private received = 0;

	/** Text for the downstream that is not a message, e.g. a heartbeat. */
	private control = "";

	private downstream: Downstream | null = null;

	private flushScheduled = false;

	/** Why the server closed the session; the last thing a downstream carries. */
	private closeEvent: CloseEvent | null = null;

	constructor(private readonly options: HttpFallbackSessionOptions) {
		this.key = options.key;
		this.clientConnection = options.connect(this);
	}

	send(data: Parameters<WebSocketLike["send"]>[0]): void {
		if (this.readyState !== WsReadyStates.Open) {
			return;
		}

		// A client that stays alive but does not acknowledge, or does not read,
		// must not grow the outbox forever.
		const now = Date.now();
		if (
			this.outbox.length > 0 &&
			now - this.queuedAt[0] > this.options.timeout
		) {
			this.close(ConnectionTimeout.code, ConnectionTimeout.reason);
			return;
		}

		this.outbox.push(encodeMessage(data));
		this.queuedAt.push(now);

		// One write for all the messages of this tick.
		if (!this.flushScheduled) {
			this.flushScheduled = true;
			queueMicrotask(() => {
				this.flushScheduled = false;
				this.flush();
			});
		}
	}

	/**
	 * The client has processed every message up to `cursor`. Returns false for
	 * a cursor the session has not reached.
	 */
	acknowledge(cursor: number): boolean {
		const count = cursor - this.acked;
		if (count > this.outbox.length) {
			return false;
		}

		// A request that arrives late carries an older cursor.
		if (count > 0) {
			this.outbox.splice(0, count);
			this.queuedAt.splice(0, count);
			this.acked = cursor;
			this.written = Math.max(this.written, cursor);
		}
		return true;
	}

	/**
	 * Hand the batch with the given sequence number to Hocuspocus. A batch that
	 * was handed over before is ignored. Returns false when a batch is missing
	 * in between.
	 */
	receive(sequence: number, messages: string[]): boolean {
		if (sequence <= this.received) {
			return true;
		}
		if (sequence !== this.received + 1) {
			return false;
		}

		this.received = sequence;
		for (const message of messages) {
			// A malformed message makes Hocuspocus close the connection; the rest
			// of the batch must not keep hitting it.
			if (this.readyState !== WsReadyStates.Open) {
				break;
			}
			this.clientConnection.handleMessage(fromBase64(message));
		}
		return true;
	}

	/**
	 * Answer the request that opened the session: with the open event, which
	 * tells the client the key, and then like any downstream response.
	 */
	open(mode: HttpTransportName): Response {
		const payload: HttpTransportOpenPayload = {
			key: this.key,
			heartbeatInterval: this.options.heartbeat,
			maxPayload: this.options.maxPayload,
		};
		return this.startDownstream(
			mode,
			`event: ${HttpTransportEvent.Open}\ndata: ${JSON.stringify(payload)}\n\n`,
		);
	}

	/**
	 * Start a downstream response after `cursor`, which the client has
	 * acknowledged; it replaces the previous one. Returns null for a request
	 * that arrives late: the client has acknowledged more since.
	 */
	attach(mode: HttpTransportName, cursor: number): Response | null {
		if (cursor < this.acked) {
			return null;
		}

		// Messages after the cursor that an earlier response carried go again.
		this.written = cursor;
		return this.startDownstream(mode, "");
	}

	/**
	 * Close the session from the server side (Hocuspocus, eviction, shutdown).
	 * The client learns the close event at the end of its downstream, or from
	 * the 410 its next request gets.
	 */
	close(code = 1000, reason = ""): void {
		this.finish({ code, reason }, true);
	}

	/** The client closed the session; there is nobody left to tell. */
	closedByClient(): void {
		this.finish({ code: 1005, reason: "" }, false);
	}

	private startDownstream(mode: HttpTransportName, control: string): Response {
		if (this.downstream) {
			this.endDownstream(this.downstream);
		}
		this.control = (mode === "sse" ? SSE_PADDING : "") + control;

		// `start` runs synchronously, inside the constructor.
		let downstream!: Downstream;
		const stream = new ReadableStream<Uint8Array>({
			start: (controller) => {
				downstream = { mode, controller };
			},
			// The client took the previous chunk.
			pull: () => this.flush(),
			// The client went away.
			cancel: () => this.detach(downstream),
		});
		this.downstream = downstream;
		this.flush();

		// A poll that had something to carry has ended by now.
		if (this.downstream === downstream) {
			this.startTimers(downstream);
		}

		return new Response(stream, {
			headers:
				mode === "sse"
					? { "Content-Type": "text/event-stream", "X-Accel-Buffering": "no" }
					: { "Content-Type": "text/plain; charset=utf-8" },
		});
	}

	private startTimers(downstream: Downstream): void {
		const { heartbeat } = this.options;

		if (downstream.mode === "sse") {
			downstream.timeout = setTimeout(() => {
				this.control += PROBE;
				this.flush();
			}, SSE_PROBE_DELAY);
			// Clients answer a heartbeat with a request. The interval varies per
			// stream, so the requests of clients that reconnected together do not
			// keep arriving together.
			downstream.interval = setInterval(
				() => this.writeHeartbeat(),
				heartbeat * (0.8 + 0.2 * Math.random()),
			);
			downstream.interval.unref?.();
		} else {
			// A poll that has nothing to carry by now ends with a heartbeat.
			downstream.timeout = setTimeout(() => this.writeHeartbeat(), heartbeat);
		}
		downstream.timeout.unref?.();
	}

	private writeHeartbeat(): void {
		// Heartbeats do not pile up behind a client that reads slowly.
		if (this.control === "") {
			this.control = HEARTBEAT;
		}
		this.flush();
	}

	/**
	 * Write what is waiting to the downstream, if the client keeps up with it:
	 * control text, the messages it has not been sent, the close event. A
	 * client that stopped reading leaves no room, and its messages wait in the
	 * outbox.
	 */
	private flush(): void {
		const downstream = this.downstream;
		if (!downstream || (downstream.controller.desiredSize ?? 0) <= 0) {
			return;
		}

		let text = this.control;
		for (
			let index = this.written - this.acked;
			index < this.outbox.length;
			index += 1
		) {
			this.written += 1;
			text += `id: ${this.written}\ndata: ${this.outbox[index]}\n\n`;
		}
		if (this.closeEvent) {
			text += `event: ${HttpTransportEvent.Close}\ndata: ${JSON.stringify(this.closeEvent)}\n\n`;
		}
		if (text === "") {
			return;
		}

		this.control = "";
		try {
			downstream.controller.enqueue(textEncoder.encode(text));
		} catch {
			// The client went away.
			this.detach(downstream);
			return;
		}

		// A poll carries a single write, and nothing follows the close event.
		if (downstream.mode === "polling" || this.closeEvent) {
			this.endDownstream(downstream);
		}
	}

	private detach(downstream: Downstream): void {
		clearTimeout(downstream.timeout);
		clearInterval(downstream.interval);
		if (this.downstream === downstream) {
			this.downstream = null;
		}
	}

	private endDownstream(downstream: Downstream): void {
		this.detach(downstream);
		try {
			downstream.controller.close();
		} catch {
			// The client went away.
		}
	}

	private finish(closeEvent: CloseEvent, tellClient: boolean): void {
		if (this.readyState !== WsReadyStates.Open) {
			return;
		}
		this.readyState = WsReadyStates.Closed;

		if (tellClient) {
			this.closeEvent = closeEvent;
			this.flush();
		}
		if (this.downstream) {
			this.endDownstream(this.downstream);
		}
		this.outbox = [];
		this.queuedAt = [];
		this.control = "";

		this.options.onClose(tellClient ? closeEvent : null);

		// Not right away: it may be Hocuspocus that is closing the session, in
		// the middle of its own cleanup.
		queueMicrotask(() => this.clientConnection.handleClose(closeEvent));
	}
}
