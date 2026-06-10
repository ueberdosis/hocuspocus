const SEPARATOR = '\0';

export function makeRoutingKey(documentName: string, sessionId: string): string {
	return documentName + SEPARATOR + sessionId;
}

export function parseRoutingKey(key: string): { documentName: string; sessionId: string | null } {
	const idx = key.indexOf(SEPARATOR);
	if (idx === -1) return { documentName: key, sessionId: null };
	return { documentName: key.substring(0, idx), sessionId: key.substring(idx + 1) };
}
