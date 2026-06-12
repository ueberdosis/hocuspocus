import { URLSearchParams } from "node:url";
import type Document from "./Document.ts";
import type { Hocuspocus } from "./Hocuspocus.ts";
import type {
	DirectConnection as DirectConnectionInterface,
	DisconnectOptions,
	LocalTransactionOrigin,
} from "./types.ts";

export class DirectConnection<Context = any>
	implements DirectConnectionInterface
{
	document: Document | null = null;

	instance!: Hocuspocus;

	context: Context;

	/**
	 * Constructor.
	 */
	constructor(document: Document, instance: Hocuspocus, context?: Context) {
		this.document = document;
		this.instance = instance;
		this.context = (context ?? {}) as Context;

		this.document.addDirectConnection();
	}

	async transact(transaction: (document: Document) => void) {
		if (!this.document) {
			throw new Error("direct connection closed");
		}

		this.document.transact(
			(x) => {
				// biome-ignore lint/style/noNonNullAssertion: <explanation>
				transaction(this.document!);
			},
			{
				source: "local",
				context: this.context,
			} satisfies LocalTransactionOrigin,
		);
	}

	async disconnect(options?: DisconnectOptions) {
		if (this.document) {
			// Defaults to true regardless of the server-wide `unloadImmediately`
			// setting, so the historical "durable on disconnect" behavior is kept
			// unless a caller explicitly opts into keeping the document warm.
			const unloadImmediately = options?.unloadImmediately ?? true;

			this.document?.removeDirectConnection();

			// With unloadImmediately the document is persisted synchronously.
			// Otherwise the store is debounced, so the document stays warm in memory
			// and a follow-up direct connection can reuse it (coalescing writes),
			// mirroring how websocket connections behave on close.
			await this.instance.storeDocumentHooks(
				this.document,
				{
					clientsCount: this.document.getConnectionsCount(),
					lastContext: this.context,
					lastTransactionOrigin: {
						source: "local",
						context: this.context,
					} satisfies LocalTransactionOrigin,
					document: this.document,
					documentName: this.document.name,
					instance: this.instance,
				},
				unloadImmediately,
			);

			// If the direct connection was the only connection to the document
			// then we should trigger the onDisconnect hook for this doc. We only
			// unload it right away when unloadImmediately is set; otherwise the
			// debounced store above unloads it once it has flushed.
			if (
				this.document.getConnectionsCount() === 0 &&
				!this.document.saveMutex.isLocked()
			) {
				await this.instance.hooks("onDisconnect", {
					instance: this.instance,
					clientsCount: this.document.getConnectionsCount(),
					context: this.context,
					document: this.document,
					socketId: "server",
					documentName: this.document.name,
					requestHeaders: new Headers(),
					requestParameters: new URLSearchParams(),
				});

				if (unloadImmediately) {
					await this.instance.unloadDocument(this.document);
				}
			}

			this.document = null;
		}
	}
}
