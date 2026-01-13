/**
 * Get parameters by the given request
 */
export function getParameters(request?: { url?: string }): URLSearchParams {
	const url = request?.url;
	if (!url) {
		return new URLSearchParams();
	}
	// Handle both full URLs (web Request) and path-only URLs (Node.js IncomingMessage)
	const query = url.includes("://")
		? new URL(url).searchParams
		: new URLSearchParams(url.split("?")[1] || "");
	return query;
}
