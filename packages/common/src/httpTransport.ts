/**
 * Shared constants of the HTTP fallback transports (SSE and long-polling)
 * spoken between `@hocuspocus/server`'s `HttpFallback` and
 * `@hocuspocus/provider`.
 */
export type HttpTransportName = "sse" | "polling";

/** Reserved query parameters of HTTP transport requests. */
export const HttpTransportParameter = {
	SessionId: "hp_sid",
	Transport: "hp_transport",
	Cursor: "hp_cursor",
	Sequence: "hp_seq",
	Close: "hp_close",
} as const;

/** Named events of the downstream event stream. */
export const HttpTransportEvent = {
	Open: "hp-open",
	Close: "hp-close",
} as const;

/** Text of the comment the server writes shortly after an event stream attaches. */
export const HTTP_TRANSPORT_PROBE = "probe";

/** Payload of the `hp-open` event. */
export interface HttpTransportOpenPayload {
	key: string;
	heartbeatInterval: number;
	maxPayload: number;
}
