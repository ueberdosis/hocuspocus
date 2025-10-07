import crypto from "node:crypto";
import type { IncomingMessage } from "node:http";
import { ResetConnection, awarenessStatesToArray } from "@hocuspocus/common";
import type WebSocket from "ws";
import type { Doc } from "yjs";
import { applyUpdate, encodeStateAsUpdate } from "yjs";
import meta from "../package.json" assert { type: "json" };
import { ClientConnection } from "./ClientConnection.ts";
import type Connection from "./Connection.ts";
import { DirectConnection } from "./DirectConnection.ts";
import Document from "./Document.ts";
import type { Server } from "./Server.ts";
import type {
	AwarenessUpdate,
	Configuration,
	ConnectionConfiguration,
	HookName,
	HookPayloadByName,
	beforeBroadcastStatelessPayload,
	onChangePayload,
	onDisconnectPayload,
	onStoreDocumentPayload,
} from "./types.ts";
import { useDebounce } from "./util/debounce.ts";
import { getParameters } from "./util/getParameters.ts";

export const defaultConfiguration = {
	name: null,
	timeout: 30000,
	debounce: 2000,
	maxDebounce: 10000,
	quiet: false,
	yDocOptions: {
		gc: true,
		gcFilter: () => true,
	},
	unloadImmediately: true,
};

export class Hocuspocus {
	configuration: Configuration = {
		...defaultConfiguration,
		extensions: [],
		onConfigure: () => new Promise((r) => r(null)),
		onListen: () => new Promise((r) => r(null)),
		onUpgrade: () => new Promise((r) => r(null)),
		onConnect: () => new Promise((r) => r(null)),
		connected: () => new Promise((r) => r(null)),
		beforeHandleMessage: () => new Promise((r) => r(null)),
		beforeSync: () => new Promise((r) => r(null)),
		beforeBroadcastStateless: () => new Promise((r) => r(null)),
		onStateless: () => new Promise((r) => r(null)),
		onChange: () => new Promise((r) => r(null)),
		onCreateDocument: () => new Promise((r) => r(null)),
		onLoadDocument: () => new Promise((r) => r(null)),
		onStoreDocument: () => new Promise((r) => r(null)),
		afterStoreDocument: () => new Promise((r) => r(null)),
		onAwarenessUpdate: () => new Promise((r) => r(null)),
		onRequest: () => new Promise((r) => r(null)),
		onDisconnect: () => new Promise((r) => r(null)),
		onDestroy: () => new Promise((r) => r(null)),
	};

	loadingDocuments: Map<string, Promise<Document>> = new Map();

	documents: Map<string, Document> = new Map();

	server?: Server;

	debouncer = useDebounce();

	constructor(configuration?: Partial<Configuration>) {
		if (configuration) {
			this.configure(configuration);
		}
	}

	/**
	 * Configure Hocuspocus
	 */
	configure(configuration: Partial<Configuration>): Hocuspocus {
		this.configuration = {
			...this.configuration,
			...configuration,
		};

		this.configuration.extensions.sort((a, b) => {
			const one = typeof a.priority === "undefined" ? 100 : a.priority;
			const two = typeof b.priority === "undefined" ? 100 : b.priority;

			if (one > two) {
				return -1;
			}

			if (one < two) {
				return 1;
			}

			return 0;
		});

		this.configuration.extensions.push({
			onConfigure: this.configuration.onConfigure,
			onListen: this.configuration.onListen,
			onUpgrade: this.configuration.onUpgrade,
			onConnect: this.configuration.onConnect,
			connected: this.configuration.connected,
			onAuthenticate: this.configuration.onAuthenticate,
			onLoadDocument: this.configuration.onLoadDocument,
			afterLoadDocument: this.configuration.afterLoadDocument,
			beforeHandleMessage: this.configuration.beforeHandleMessage,
			beforeBroadcastStateless: this.configuration.beforeBroadcastStateless,
			beforeSync: this.configuration.beforeSync,
			onStateless: this.configuration.onStateless,
			onChange: this.configuration.onChange,
			onStoreDocument: this.configuration.onStoreDocument,
			afterStoreDocument: this.configuration.afterStoreDocument,
			onAwarenessUpdate: this.configuration.onAwarenessUpdate,
			onRequest: this.configuration.onRequest,
			beforeUnloadDocument: this.configuration.beforeUnloadDocument,
			afterUnloadDocument: this.configuration.afterUnloadDocument,
			onDisconnect: this.configuration.onDisconnect,
			onDestroy: this.configuration.onDestroy,
		});

		this.hooks("onConfigure", {
			configuration: this.configuration,
			version: meta.version,
			instance: this,
		});

		return this;
	}

	/**
	 * Get the total number of active documents
	 */
	getDocumentsCount(): number {
		return this.documents.size;
	}

	/**
	 * Get the total number of active connections
	 */
	getConnectionsCount(): number {
		const uniqueSocketIds = new Set<string>();
		const totalDirectConnections = Array.from(this.documents.values()).reduce(
			(acc, document) => {
				// Accumulate unique socket IDs
				document.getConnections().forEach(({ socketId }) => {
					uniqueSocketIds.add(socketId);
				});
				// Accumulate direct connections
				return acc + document.directConnectionsCount;
			},
			0,
		);
		// Return the sum of unique socket IDs and direct connections
		return uniqueSocketIds.size + totalDirectConnections;
	}

	/**
	 * Force close one or more connections
	 */
	closeConnections(documentName?: string) {
		// Iterate through all connections for all documents
		// and invoke their close method, which is a graceful
		// disconnect wrapper around the underlying websocket.close
		this.documents.forEach((document: Document) => {
			// If a documentName was specified, bail if it doesn't match
			if (documentName && document.name !== documentName) {
				return;
			}

			document.connections.forEach(({ connection }) => {
				connection.close(ResetConnection);
			});
		});
	}

	/**
	 * The `handleConnection` method receives incoming WebSocket connections,
	 * runs all hooks:
	 *
	 *  - onConnect for all connections
	 *  - onAuthenticate only if required
	 *
	 * … and if nothing fails it’ll fully establish the connection and
	 * load the Document then.
	 */
	handleConnection(
		incoming: WebSocket,
		request: IncomingMessage,
		defaultContext: any = {},
	): void {
		const clientConnection = new ClientConnection(
			incoming,
			request,
			this,
			this.hooks.bind(this),
			{
				timeout: this.configuration.timeout,
			},
			defaultContext,
		);
		clientConnection.onClose(
			(document: Document, hookPayload: onDisconnectPayload) => {
				// Check if there are still no connections to the document, as these hooks
				// may take some time to resolve (e.g. database queries). If a
				// new connection were to come in during that time it would rely on the
				// document in the map that we remove now.
				if (document.getConnectionsCount() > 0) {
					return;
				}

				// If it’s the last connection, we need to make sure to store the
				// document. Use the debouncer executeNow helper, to run scheduled
				// onStoreDocument immediately and clear running timers.
				// If there is no scheduled run for this document there is no point in
				// triggering onStoreDocument hook, as everything seems to be stored already.
				// Only run this if the document has finished loading earlier (i.e. not to persist the empty
				// ydoc if the onLoadDocument hook returned an error)
				if (
					!document.isLoading &&
					this.debouncer.isDebounced(`onStoreDocument-${document.name}`)
				) {
					if (this.configuration.unloadImmediately) {
						this.debouncer.executeNow(`onStoreDocument-${document.name}`);
					}
				} else {
					// Remove document from memory immediately
					this.unloadDocument(document);
				}
			},
		);
	}

	/**
	 * Handle update of the given document
	 *
	 * "connection" is not necessarily type "Connection", it's the Yjs "origin" (which is "Connection" if
	 * the update is incoming from the provider, but can be anything if the updates is originated from an extension.
	 */
	private async handleDocumentUpdate(
		document: Document,
		connection: Connection | undefined,
		update: Uint8Array,
		request?: IncomingMessage,
	) {
		const hookPayload: onChangePayload | onStoreDocumentPayload = {
			instance: this,
			clientsCount: document.getConnectionsCount(),
			context: connection?.context || {},
			document,
			documentName: document.name,
			requestHeaders: request?.headers ?? {},
			requestParameters: getParameters(request),
			socketId: connection?.socketId ?? "",
			update,
			transactionOrigin: connection,
		};

		this.hooks("onChange", hookPayload);

		// If the update was received through other ways than the
		// WebSocket connection, we don’t need to feel responsible for
		// storing the content.
		// also ignore changes incoming through redis connection, as this would be a breaking change (#730, #696, #606)
		if (
			!connection ||
			(connection as unknown as string) === "__hocuspocus__redis__origin__"
		) {
			return;
		}

		await this.storeDocumentHooks(document, hookPayload);
	}

	/**
	 * Create a new document by the given request
	 */
	public async createDocument(
		documentName: string,
		request: Partial<Pick<IncomingMessage, "headers" | "url">>,
		socketId: string,
		connection: ConnectionConfiguration,
		context?: any,
	): Promise<Document> {
		const existingLoadingDoc = this.loadingDocuments.get(documentName);

		if (existingLoadingDoc) {
			return existingLoadingDoc;
		}

		const existingDoc = this.documents.get(documentName);
		if (existingDoc) {
			return Promise.resolve(existingDoc);
		}

		const loadDocPromise = this.loadDocument(
			documentName,
			request,
			socketId,
			connection,
			context,
		);

		this.loadingDocuments.set(documentName, loadDocPromise);

		try {
			const doc = await loadDocPromise;
			this.documents.set(documentName, doc);
			this.loadingDocuments.delete(documentName);
			return doc;
		} catch (e) {
			this.loadingDocuments.delete(documentName);
			throw e;
		}
	}

	async loadDocument(
		documentName: string,
		request: Partial<Pick<IncomingMessage, "headers" | "url">>,
		socketId: string,
		connectionConfig: ConnectionConfiguration,
		context?: any,
	): Promise<Document> {
		const requestHeaders = request.headers ?? {};
		const requestParameters = getParameters(request);

		const yDocOptions = await this.hooks("onCreateDocument", {
			documentName,
			requestHeaders,
			requestParameters,
			connectionConfig,
			context,
			socketId,
			instance: this,
		});

		const document = new Document(documentName, {
			...this.configuration.yDocOptions,
			...yDocOptions,
		});

		const hookPayload = {
			instance: this,
			context,
			connectionConfig,
			document,
			documentName,
			socketId,
			requestHeaders,
			requestParameters,
		};

		try {
			await this.hooks(
				"onLoadDocument",
				hookPayload,
				(loadedDocument: Doc | undefined) => {
					// if a hook returns a Y-Doc, encode the document state as update
					// and apply it to the newly created document
					// Note: instanceof doesn't work, because Doc !== Doc for some reason I don't understand
					if (
						loadedDocument?.constructor.name === "Document" ||
						loadedDocument?.constructor.name === "Doc"
					) {
						applyUpdate(document, encodeStateAsUpdate(loadedDocument));
					}
				},
			);
		} catch (e) {
			this.closeConnections(documentName);
			this.unloadDocument(document);
			throw e;
		}

		document.isLoading = false;
		await this.hooks("afterLoadDocument", hookPayload);

		document.onUpdate(
			(document: Document, connection: Connection, update: Uint8Array) => {
				this.handleDocumentUpdate(
					document,
					connection,
					update,
					connection?.request,
				);
			},
		);

		document.beforeBroadcastStateless(
			(document: Document, stateless: string) => {
				const hookPayload: beforeBroadcastStatelessPayload = {
					document,
					documentName: document.name,
					payload: stateless,
				};

				this.hooks("beforeBroadcastStateless", hookPayload);
			},
		);

		document.awareness.on("update", (update: AwarenessUpdate) => {
			this.hooks("onAwarenessUpdate", {
				...hookPayload,
				...update,
				awareness: document.awareness,
				states: awarenessStatesToArray(document.awareness.getStates()),
			});
		});

		return document;
	}

	storeDocumentHooks(
		document: Document,
		hookPayload: onStoreDocumentPayload,
		immediately?: boolean,
	) {
		const debounceId = `onStoreDocument-${document.name}`;
		return this.debouncer.debounce(
			debounceId,
			async () => {
				try {
					await document.saveMutex.runExclusive(async () => {
						await this.hooks("onStoreDocument", hookPayload);
						await this.hooks("afterStoreDocument", hookPayload);
					});
				} catch (error: any) {
					console.error("Caught error during storeDocumentHooks", error);
					if (error?.message) {
						throw error;
					}
				} finally {
					const hasPendingWork =
						this.debouncer.isDebounced(debounceId) ||
						document.saveMutex.isLocked();
					const shouldUnload =
						document.getConnectionsCount() == 0 && !hasPendingWork;
					if (shouldUnload) {
						this.unloadDocument(document);
					}
				}
			},
			immediately ? 0 : this.configuration.debounce,
			this.configuration.maxDebounce,
		);
	}

	/**
	 * Run the given hook on all configured extensions.
	 * Runs the given callback after each hook.
	 */
	// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
	hooks<T extends HookName>(
		name: T,
		payload: HookPayloadByName[T],
		callback: Function | null = null,
	): Promise<any> {
		const { extensions } = this.configuration;

		// create a new `thenable` chain
		// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/resolve
		let chain = Promise.resolve();

		extensions
			// get me all extensions which have the given hook
			.filter((extension) => typeof extension[name] === "function")
			// run through all the configured hooks
			.forEach((extension) => {
				chain = chain
					.then(() => (extension[name] as any)?.(payload))
					.catch((error) => {
						// make sure to log error messages
						if (error?.message) {
							console.error(`[${name}]`, error.message);
						}

						throw error;
					});

				if (callback) {
					chain = chain.then((...args: any[]) => callback(...args));
				}
			});

		return chain;
	}

	async unloadDocument(document: Document): Promise<any> {
		const documentName = document.name;
		if (!this.documents.has(documentName)) return;

		try {
			await this.hooks("beforeUnloadDocument", {
				instance: this,
				documentName,
				document,
			});
		} catch (e) {
			return;
		}

		if (document.getConnectionsCount() > 0) {
			return;
		}

		this.documents.delete(documentName);
		document.destroy();
		await this.hooks("afterUnloadDocument", { instance: this, documentName });
	}

	async openDirectConnection(
		documentName: string,
		context?: any,
	): Promise<DirectConnection> {
		const connectionConfig: ConnectionConfiguration = {
			isAuthenticated: true,
			readOnly: false,
		};

		const document: Document = await this.createDocument(
			documentName,
			{}, // direct connection has no request params
			crypto.randomUUID(),
			connectionConfig,
			context,
		);

		return new DirectConnection(document, this, context);
	}
}
