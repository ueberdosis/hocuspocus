import { awarenessStatesToArray } from "@hocuspocus/common";
import type { Event, MessageEvent } from "ws";
import { Awareness, removeAwarenessStates } from "y-protocols/awareness";
import * as Y from "yjs";
import EventEmitter from "./EventEmitter.ts";
import type { CompleteHocuspocusProviderWebsocketConfiguration } from "./HocuspocusProviderWebsocket.ts";
import { HocuspocusProviderWebsocket } from "./HocuspocusProviderWebsocket.ts";
import { IncomingMessage } from "./IncomingMessage.ts";
import { MessageReceiver } from "./MessageReceiver.ts";
import { MessageSender } from "./MessageSender.ts";
import { AuthenticationMessage } from "./OutgoingMessages/AuthenticationMessage.ts";
import { AwarenessMessage } from "./OutgoingMessages/AwarenessMessage.ts";
import { StatelessMessage } from "./OutgoingMessages/StatelessMessage.ts";
import { SyncStepOneMessage } from "./OutgoingMessages/SyncStepOneMessage.ts";
import { UpdateMessage } from "./OutgoingMessages/UpdateMessage.ts";
import type {
	ConstructableOutgoingMessage,
	onAuthenticatedParameters,
	onAuthenticationFailedParameters,
	onAwarenessChangeParameters,
	onAwarenessUpdateParameters,
	onCloseParameters,
	onDisconnectParameters,
	onMessageParameters,
	onOpenParameters,
	onOutgoingMessageParameters,
	onStatelessParameters,
	onStatusParameters,
	onSyncedParameters,
	onUnsyncedChangesParameters,
} from "./types.ts";

export type HocuspocusProviderConfiguration = Required<
	Pick<CompleteHocuspocusProviderConfiguration, "name">
> &
	Partial<CompleteHocuspocusProviderConfiguration> &
	(
		| Required<Pick<CompleteHocuspocusProviderWebsocketConfiguration, "url">>
		| Required<
				Pick<CompleteHocuspocusProviderConfiguration, "websocketProvider">
		  >
	);

export interface CompleteHocuspocusProviderConfiguration {
	/**
	 * The identifier/name of your document
	 */
	name: string;
	/**
	 * The actual Y.js document
	 */
	document: Y.Doc;

	/**
	 * An Awareness instance to keep the presence state of all clients.
	 *
	 * You can disable sharing awareness information by passing `null`.
	 * Note that having no awareness information shared across all connections will break our ping checks
	 * and thus trigger reconnects. You should always have at least one Provider with enabled awareness per
	 * socket connection, or ensure that the Provider receives messages before running into `HocuspocusProviderWebsocket.messageReconnectTimeout`.
	 */
	awareness: Awareness | null;

	/**
	 * A token that’s sent to the backend for authentication purposes.
	 */
	token: string | (() => string) | (() => Promise<string>) | null;

	/**
	 * Hocuspocus websocket provider
	 */
	websocketProvider: HocuspocusProviderWebsocket;

	/**
	 * Force syncing the document in the defined interval.
	 */
	forceSyncInterval: false | number;

	onAuthenticated: (data: onAuthenticatedParameters) => void;
	onAuthenticationFailed: (data: onAuthenticationFailedParameters) => void;
	onOpen: (data: onOpenParameters) => void;
	onConnect: () => void;
	onStatus: (data: onStatusParameters) => void;
	onMessage: (data: onMessageParameters) => void;
	onOutgoingMessage: (data: onOutgoingMessageParameters) => void;
	onSynced: (data: onSyncedParameters) => void;
	onDisconnect: (data: onDisconnectParameters) => void;
	onClose: (data: onCloseParameters) => void;
	onDestroy: () => void;
	onAwarenessUpdate: (data: onAwarenessUpdateParameters) => void;
	onAwarenessChange: (data: onAwarenessChangeParameters) => void;
	onStateless: (data: onStatelessParameters) => void;
	onUnsyncedChanges: (data: onUnsyncedChangesParameters) => void;
}

export class AwarenessError extends Error {
	code = 1001;
}

export class HocuspocusProvider extends EventEmitter {
	public configuration: CompleteHocuspocusProviderConfiguration = {
		name: "",
		// @ts-ignore
		document: undefined,
		// @ts-ignore
		awareness: undefined,
		token: null,
		forceSyncInterval: false,
		onAuthenticated: () => null,
		onAuthenticationFailed: () => null,
		onOpen: () => null,
		onConnect: () => null,
		onMessage: () => null,
		onOutgoingMessage: () => null,
		onSynced: () => null,
		onStatus: () => null,
		onDisconnect: () => null,
		onClose: () => null,
		onDestroy: () => null,
		onAwarenessUpdate: () => null,
		onAwarenessChange: () => null,
		onStateless: () => null,
		onUnsyncedChanges: () => null,
	};

	isSynced = false;

	unsyncedChanges = 0;

	isAuthenticated = false;

	authorizedScope: string | undefined = undefined;

	// @internal
	manageSocket = false;

	private _isAttached = false;

	intervals: any = {
		forceSync: null,
	};

	constructor(configuration: HocuspocusProviderConfiguration) {
		super();
		this.setConfiguration(configuration);

		this.configuration.document = configuration.document
			? configuration.document
			: new Y.Doc();
		this.configuration.awareness =
			configuration.awareness !== undefined
				? configuration.awareness
				: new Awareness(this.document);

		this.on("open", this.configuration.onOpen);
		this.on("message", this.configuration.onMessage);
		this.on("outgoingMessage", this.configuration.onOutgoingMessage);
		this.on("synced", this.configuration.onSynced);
		this.on("destroy", this.configuration.onDestroy);
		this.on("awarenessUpdate", this.configuration.onAwarenessUpdate);
		this.on("awarenessChange", this.configuration.onAwarenessChange);
		this.on("stateless", this.configuration.onStateless);
		this.on("unsyncedChanges", this.configuration.onUnsyncedChanges);

		this.on("authenticated", this.configuration.onAuthenticated);
		this.on("authenticationFailed", this.configuration.onAuthenticationFailed);

		this.awareness?.on("update", () => {
			this.emit("awarenessUpdate", {
				states: awarenessStatesToArray(this.awareness!.getStates()),
			});
		});

		this.awareness?.on("change", () => {
			this.emit("awarenessChange", {
				states: awarenessStatesToArray(this.awareness!.getStates()),
			});
		});

		this.document.on("update", this.boundDocumentUpdateHandler);
		this.awareness?.on("update", this.boundAwarenessUpdateHandler);

		this.registerEventListeners();

		if (
			this.configuration.forceSyncInterval &&
			typeof this.configuration.forceSyncInterval === "number"
		) {
			this.intervals.forceSync = setInterval(
				this.forceSync.bind(this),
				this.configuration.forceSyncInterval,
			);
		}

		if (this.manageSocket) {
			this.attach();
		}
	}

	boundDocumentUpdateHandler = this.documentUpdateHandler.bind(this);

	boundAwarenessUpdateHandler = this.awarenessUpdateHandler.bind(this);

	boundPageHide = this.pageHide.bind(this);

	boundOnOpen = this.onOpen.bind(this);

	boundOnClose = this.onClose.bind(this);

	forwardConnect = () => this.emit("connect");

	forwardStatus = (e: onStatusParameters) => this.emit("status", e);

	forwardClose = (e: onCloseParameters) => this.emit("close", e);

	forwardDisconnect = (e: onDisconnectParameters) => this.emit("disconnect", e);

	forwardDestroy = () => this.emit("destroy");

	public setConfiguration(
		configuration: Partial<HocuspocusProviderConfiguration> = {},
	): void {
		if (!configuration.websocketProvider) {
			const websocketProviderConfig =
				configuration as CompleteHocuspocusProviderWebsocketConfiguration;
			this.manageSocket = true;
			this.configuration.websocketProvider = new HocuspocusProviderWebsocket({
				url: websocketProviderConfig.url,
			});
		}

		this.configuration = { ...this.configuration, ...configuration };
	}

	get document() {
		return this.configuration.document;
	}

	public get isAttached() {
		return this._isAttached;
	}

	get awareness() {
		return this.configuration.awareness;
	}

	get hasUnsyncedChanges(): boolean {
		return this.unsyncedChanges > 0;
	}

	private resetUnsyncedChanges() {
		this.unsyncedChanges = 1;
		this.emit("unsyncedChanges", { number: this.unsyncedChanges });
	}

	incrementUnsyncedChanges() {
		this.unsyncedChanges += 1;
		this.emit("unsyncedChanges", { number: this.unsyncedChanges });
	}

	decrementUnsyncedChanges() {
		if (this.unsyncedChanges > 0) {
			this.unsyncedChanges -= 1;
		}

		if (this.unsyncedChanges === 0) {
			this.synced = true;
		}

		this.emit("unsyncedChanges", { number: this.unsyncedChanges });
	}

	forceSync() {
		this.resetUnsyncedChanges();

		this.send(SyncStepOneMessage, {
			document: this.document,
			documentName: this.configuration.name,
		});
	}

	pageHide() {
		if (this.awareness) {
			removeAwarenessStates(
				this.awareness,
				[this.document.clientID],
				"page hide",
			);
		}
	}

	registerEventListeners() {
		if (typeof window === "undefined" || !("addEventListener" in window)) {
			return;
		}

		window.addEventListener("pagehide", this.boundPageHide);
	}

	sendStateless(payload: string) {
		this.send(StatelessMessage, {
			documentName: this.configuration.name,
			payload,
		});
	}

	documentUpdateHandler(update: Uint8Array, origin: any) {
		if (origin === this) {
			return;
		}

		this.incrementUnsyncedChanges();
		this.send(UpdateMessage, { update, documentName: this.configuration.name });
	}

	awarenessUpdateHandler({ added, updated, removed }: any, origin: any) {
		const changedClients = added.concat(updated).concat(removed);

		this.send(AwarenessMessage, {
			awareness: this.awareness,
			clients: changedClients,
			documentName: this.configuration.name,
		});
	}

	/**
	 * Indicates whether a first handshake with the server has been established
	 *
	 * Note: this does not mean all updates from the client have been persisted to the backend. For this,
	 * use `hasUnsyncedChanges`.
	 */
	get synced(): boolean {
		return this.isSynced;
	}

	set synced(state) {
		if (this.isSynced === state) {
			return;
		}

		this.isSynced = state;

		if (state) {
			this.emit("synced", { state });
		}
	}

	receiveStateless(payload: string) {
		this.emit("stateless", { payload });
	}

	// not needed, but provides backward compatibility with e.g. lexical/yjs
	async connect() {
		if (this.manageSocket) {
			return this.configuration.websocketProvider.connect();
		}

		console.warn(
			"HocuspocusProvider::connect() is deprecated and does not do anything. Please connect/disconnect on the websocketProvider, or attach/deattach providers.",
		);
	}

	disconnect() {
		if (this.manageSocket) {
			return this.configuration.websocketProvider.disconnect();
		}

		console.warn(
			"HocuspocusProvider::disconnect() is deprecated and does not do anything. Please connect/disconnect on the websocketProvider, or attach/deattach providers.",
		);
	}

	async onOpen(event: Event) {
		this.isAuthenticated = false;

		this.emit("open", { event });

		let token: string | null;
		try {
			token = await this.getToken();
		} catch (error) {
			this.permissionDeniedHandler(`Failed to get token: ${error}`);
			return;
		}

		this.send(AuthenticationMessage, {
			token: token ?? "",
			documentName: this.configuration.name,
		});

		this.startSync();
	}

	async getToken() {
		if (typeof this.configuration.token === "function") {
			const token = await this.configuration.token();
			return token;
		}

		return this.configuration.token;
	}

	startSync() {
		this.resetUnsyncedChanges();

		this.send(SyncStepOneMessage, {
			document: this.document,
			documentName: this.configuration.name,
		});

		if (this.awareness && this.awareness.getLocalState() !== null) {
			this.send(AwarenessMessage, {
				awareness: this.awareness,
				clients: [this.document.clientID],
				documentName: this.configuration.name,
			});
		}
	}

	send(message: ConstructableOutgoingMessage, args: any) {
		if (!this._isAttached) return;

		const messageSender = new MessageSender(message, args);

		this.emit("outgoingMessage", { message: messageSender.message });
		messageSender.send(this.configuration.websocketProvider);
	}

	onMessage(event: MessageEvent) {
		const message = new IncomingMessage(event.data);

		const documentName = message.readVarString();

		message.writeVarString(documentName);

		this.emit("message", { event, message: new IncomingMessage(event.data) });

		new MessageReceiver(message).apply(this, true);
	}

	onClose() {
		this.isAuthenticated = false;
		this.synced = false;

		// update awareness (all users except local left)
		if (this.awareness) {
			removeAwarenessStates(
				this.awareness,
				Array.from(this.awareness.getStates().keys()).filter(
					(client) => client !== this.document.clientID,
				),
				this,
			);
		}
	}

	destroy() {
		this.emit("destroy");

		if (this.intervals.forceSync) {
			clearInterval(this.intervals.forceSync);
		}

		if (this.awareness) {
			removeAwarenessStates(
				this.awareness,
				[this.document.clientID],
				"provider destroy",
			);
			this.awareness.off("update", this.boundAwarenessUpdateHandler);
			this.awareness.destroy();
		}

		this.document.off("update", this.boundDocumentUpdateHandler);

		this.removeAllListeners();

		this.detach();

		if (this.manageSocket) {
			this.configuration.websocketProvider.destroy();
		}

		if (typeof window === "undefined" || !("removeEventListener" in window)) {
			return;
		}

		window.removeEventListener("pagehide", this.boundPageHide);
	}

	detach() {
		this.configuration.websocketProvider.off(
			"connect",
			this.configuration.onConnect,
		);
		this.configuration.websocketProvider.off("connect", this.forwardConnect);

		this.configuration.websocketProvider.off("status", this.forwardStatus);
		this.configuration.websocketProvider.off(
			"status",
			this.configuration.onStatus,
		);

		this.configuration.websocketProvider.off("open", this.boundOnOpen);
		this.configuration.websocketProvider.off("close", this.boundOnClose);
		this.configuration.websocketProvider.off(
			"close",
			this.configuration.onClose,
		);
		this.configuration.websocketProvider.off("close", this.forwardClose);
		this.configuration.websocketProvider.off(
			"disconnect",
			this.configuration.onDisconnect,
		);
		this.configuration.websocketProvider.off(
			"disconnect",
			this.forwardDisconnect,
		);
		this.configuration.websocketProvider.off(
			"destroy",
			this.configuration.onDestroy,
		);
		this.configuration.websocketProvider.off("destroy", this.forwardDestroy);

		this.configuration.websocketProvider.detach(this);

		this._isAttached = false;
	}

	attach() {
		if (this._isAttached) return;

		this.configuration.websocketProvider.on(
			"connect",
			this.configuration.onConnect,
		);
		this.configuration.websocketProvider.on("connect", this.forwardConnect);

		this.configuration.websocketProvider.on(
			"status",
			this.configuration.onStatus,
		);
		this.configuration.websocketProvider.on("status", this.forwardStatus);

		this.configuration.websocketProvider.on("open", this.boundOnOpen);

		this.configuration.websocketProvider.on("close", this.boundOnClose);
		this.configuration.websocketProvider.on(
			"close",
			this.configuration.onClose,
		);
		this.configuration.websocketProvider.on("close", this.forwardClose);

		this.configuration.websocketProvider.on(
			"disconnect",
			this.configuration.onDisconnect,
		);
		this.configuration.websocketProvider.on(
			"disconnect",
			this.forwardDisconnect,
		);

		this.configuration.websocketProvider.on(
			"destroy",
			this.configuration.onDestroy,
		);
		this.configuration.websocketProvider.on("destroy", this.forwardDestroy);

		this.configuration.websocketProvider.attach(this);

		this._isAttached = true;
	}

	permissionDeniedHandler(reason: string) {
		this.emit("authenticationFailed", { reason });
		this.isAuthenticated = false;
	}

	authenticatedHandler(scope: string) {
		this.isAuthenticated = true;
		this.authorizedScope = scope;

		this.emit("authenticated", { scope });
	}

	setAwarenessField(key: string, value: any) {
		if (!this.awareness) {
			throw new AwarenessError(
				`Cannot set awareness field "${key}" to ${JSON.stringify(value)}. You have disabled Awareness for this provider by explicitly passing awareness: null in the provider configuration.`,
			);
		}
		this.awareness.setLocalStateField(key, value);
	}
}
