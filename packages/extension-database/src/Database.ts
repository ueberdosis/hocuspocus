import type {
	Extension,
	onChangePayload,
	onLoadDocumentPayload,
	storePayload,
	fetchPayload,
} from "@hocuspocus/server";
import * as Y from "yjs";

export interface DatabaseConfiguration {
	/**
	 * Pass a Promise to retrieve updates from your database. The Promise should resolve to
	 * an array of items with Y.js-compatible binary data.
	 */
	fetch: (data: fetchPayload) => Promise<Uint8Array | null>;
	/**
	 * Pass a function to store updates in your database.
	 */
	store: (data: storePayload) => Promise<void>;
}

export class Database implements Extension {
	/**
	 * Default configuration
	 */
	configuration: DatabaseConfiguration = {
		fetch: async () => null,
		store: async () => {},
	};

	/**
	 * Constructor
	 */
	constructor(configuration: Partial<DatabaseConfiguration>) {
		this.configuration = {
			...this.configuration,
			...configuration,
		};
	}

	/**
	 * Get stored data from the database.
	 */
	async onLoadDocument(data: onLoadDocumentPayload): Promise<any> {
		const update = await this.configuration.fetch(data);

		if (update) {
			Y.applyUpdate(data.document, update);
		}
	}

	/**
	 * Store new updates in the database.
	 */
	async onStoreDocument(data: onChangePayload) {
		await this.configuration.store({
			...data,
			state: Buffer.from(Y.encodeStateAsUpdate(data.document)),
		});
	}
}
