import type { Encoder } from "lib0/encoding";
import type { Event, MessageEvent } from "ws";
import type { Awareness } from "y-protocols/awareness";
import type * as Y from "yjs";
import type { CloseEvent } from "@hocuspocus/common";
import type { IncomingMessage } from "./IncomingMessage.ts";
import type { OutgoingMessage } from "./OutgoingMessage.ts";
import type { AuthenticationMessage } from "./OutgoingMessages/AuthenticationMessage.ts";
import type { AwarenessMessage } from "./OutgoingMessages/AwarenessMessage.ts";
import type { QueryAwarenessMessage } from "./OutgoingMessages/QueryAwarenessMessage.ts";
import type { SyncStepOneMessage } from "./OutgoingMessages/SyncStepOneMessage.ts";
import type { SyncStepTwoMessage } from "./OutgoingMessages/SyncStepTwoMessage.ts";
import type { UpdateMessage } from "./OutgoingMessages/UpdateMessage.ts";

export enum MessageType {
	Sync = 0,
	Awareness = 1,
	Auth = 2,
	QueryAwareness = 3,
	Stateless = 5,
	CLOSE = 7,
	SyncStatus = 8,
}

export enum WebSocketStatus {
	Connecting = "connecting",
	Connected = "connected",
	Disconnected = "disconnected",
}

export interface OutgoingMessageInterface {
	encoder: Encoder;
	type?: MessageType;
}

export interface OutgoingMessageArguments {
	documentName: string;
	token: string;
	document: Y.Doc;
	awareness: Awareness;
	clients: number[];
	states: Map<number, { [key: string]: any }>;
	update: any;
	payload: string;
	encoder: Encoder;
}

export interface Constructable<T> {
	new (...args: any): T;
}

export type ConstructableOutgoingMessage =
	| Constructable<AuthenticationMessage>
	| Constructable<AwarenessMessage>
	| Constructable<QueryAwarenessMessage>
	| Constructable<SyncStepOneMessage>
	| Constructable<SyncStepTwoMessage>
	| Constructable<UpdateMessage>;

export type onAuthenticationFailedParameters = {
	reason: string;
};

export type onAuthenticatedParameters = {
	scope: "read-write" | "readonly";
};

export type onOpenParameters = {
	event: Event;
};

export type onMessageParameters = {
	event: MessageEvent;
	message: IncomingMessage;
};

export type onOutgoingMessageParameters = {
	message: OutgoingMessage;
};

export type onStatusParameters = {
	status: WebSocketStatus;
};

export type onSyncedParameters = {
	state: boolean;
};

export type onUnsyncedChangesParameters = {
	number: number;
};

export type onDisconnectParameters = {
	event: CloseEvent;
};

export type onCloseParameters = {
	event: CloseEvent;
};

export type onAwarenessUpdateParameters = {
	states: StatesArray;
};

export type onAwarenessChangeParameters = {
	states: StatesArray;
};

export type onStatelessParameters = {
	payload: string;
};

export type StatesArray = { clientId: number; [key: string | number]: any }[];
