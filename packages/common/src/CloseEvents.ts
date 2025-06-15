export interface CloseEvent {
	code: number;
	reason: string;
}

/**
 * The server is terminating the connection because a data frame was received
 * that is too large.
 * See: https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent/code
 */
export const MessageTooBig: CloseEvent = {
	code: 1009,
	reason: "Message Too Big",
};

/**
 * The server successfully processed the request, asks that the requester reset
 * its document view, and is not returning any content.
 */
export const ResetConnection: CloseEvent = {
	code: 4205,
	reason: "Reset Connection",
};

/**
 * Similar to Forbidden, but specifically for use when authentication is required and has
 * failed or has not yet been provided.
 */
export const Unauthorized: CloseEvent = {
	code: 4401,
	reason: "Unauthorized",
};

/**
 * The request contained valid data and was understood by the server, but the server
 * is refusing action.
 */
export const Forbidden: CloseEvent = {
	code: 4403,
	reason: "Forbidden",
};

/**
 * The server timed out waiting for the request.
 */
export const ConnectionTimeout: CloseEvent = {
	code: 4408,
	reason: "Connection Timeout",
};
