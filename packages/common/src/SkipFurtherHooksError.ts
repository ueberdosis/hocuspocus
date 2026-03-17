export class SkipFurtherHooksError extends Error {
	constructor(message?: string) {
		super(message ?? "Further hooks skipped");
		this.name = "SkipFurtherHooksError";
	}
}
