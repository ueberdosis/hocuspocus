import {
	type YjsEncodingVersion,
	applyUpdate as applyUpdateVersioned,
	encodeStateAsUpdate as encodeStateAsUpdateVersioned,
} from "@hocuspocus/common";
import type {
	Extension,
	fetchPayload,
	onChangePayload,
	onLoadDocumentPayload,
	onStoreDocumentPayload,
	storePayload,
} from "@hocuspocus/server";

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
	/**
	 * The Yjs encoding version used for storing and loading documents.
	 *
	 * - `1` (default): Standard Yjs v1 encoding.
	 * - `2`: Yjs v2 encoding. More compact but cannot be auto-detected — the
	 *   same version must be used for both storing and loading.
	 *
	 * Note: This is independent of the wire encoding version configured on the server.
	 */
	encodingVersion: YjsEncodingVersion;
}

export class Database implements Extension {
	/**
	 * Default configuration
	 */
	configuration: DatabaseConfiguration = {
		fetch: async () => null,
		store: async () => {},
		encodingVersion: 1,
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
			applyUpdateVersioned(data.document, update, undefined, this.configuration.encodingVersion);
		}
	}

	/**
	 * Store new updates in the database.
	 */
	async onStoreDocument(data: onStoreDocumentPayload) {
		await this.configuration.store({
			...data,
			state: Buffer.from(encodeStateAsUpdateVersioned(data.document, undefined, this.configuration.encodingVersion)),
		});
	}
}
