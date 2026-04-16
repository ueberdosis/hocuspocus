export const version: string =
	// @ts-expect-error - __HOCUSPOCUS_VERSION__ is replaced at build time by rolldown
	typeof __HOCUSPOCUS_VERSION__ !== "undefined"
		? // @ts-expect-error - __HOCUSPOCUS_VERSION__ is replaced at build time by rolldown
			__HOCUSPOCUS_VERSION__
		: "unknown";
