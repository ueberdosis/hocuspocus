import {
  IncomingHttpHeaders, IncomingMessage, ServerResponse,
} from 'http'
import { URLSearchParams } from 'url'
import { Awareness } from 'y-protocols/awareness'
import Connection from './Connection.js'
import Document from './Document.js'
import { Hocuspocus } from './Hocuspocus.js'

export enum MessageType {
  Unknown = -1,
  Sync = 0,
  Awareness = 1,
  Auth = 2,
  QueryAwareness = 3,
  SyncReply = 4, // same as Sync, but won't trigger another 'SyncStep1'
  Stateless = 5,
  BroadcastStateless = 6,
  CLOSE = 7,
  SyncStatus = 8,
}

export interface AwarenessUpdate {
  added: Array<any>,
  updated: Array<any>,
  removed: Array<any>,
}

export interface ConnectionConfiguration {
  readOnly: boolean
  requiresAuthentication: boolean
  isAuthenticated: boolean
}

export interface Extension {
  priority?: number;
  extensionName?: string;
  onConfigure?(data: onConfigurePayload): Promise<any>;
  onListen?(data: onListenPayload): Promise<any>;
  onUpgrade?(data: onUpgradePayload): Promise<any>;
  onConnect?(data: onConnectPayload): Promise<any>;
  connected?(data: connectedPayload): Promise<any>;
  onAuthenticate?(data: onAuthenticatePayload): Promise<any>;
  onCreateDocument?(data: onCreateDocumentPayload): Promise<any>;
  onLoadDocument?(data: onLoadDocumentPayload): Promise<any>;
  afterLoadDocument?(data: afterLoadDocumentPayload): Promise<any>;
  beforeHandleMessage?(data: beforeHandleMessagePayload): Promise<any>;
  beforeBroadcastStateless?(data: beforeBroadcastStatelessPayload): Promise<any>;
  onStateless?(payload: onStatelessPayload): Promise<any>;
  onChange?(data: onChangePayload): Promise<any>;
  onStoreDocument?(data: onStoreDocumentPayload): Promise<any>;
  afterStoreDocument?(data: afterStoreDocumentPayload): Promise<any>;
  onAwarenessUpdate?(data: onAwarenessUpdatePayload): Promise<any>;
  onRequest?(data: onRequestPayload): Promise<any>;
  onDisconnect?(data: onDisconnectPayload): Promise<any>;
  beforeUnloadDocument?(data: beforeUnloadDocumentPayload): Promise<any>;
  afterUnloadDocument?(data: afterUnloadDocumentPayload): Promise<any>;
  onDestroy?(data: onDestroyPayload): Promise<any>;
}

export type HookName =
  'onConfigure' |
  'onListen' |
  'onUpgrade' |
  'onConnect' |
  'connected' |
  'onAuthenticate' |
  'onCreateDocument' |
  'onLoadDocument' |
  'afterLoadDocument' |
  'beforeHandleMessage' |
  'beforeBroadcastStateless' |
  'onStateless' |
  'onChange' |
  'onStoreDocument' |
  'afterStoreDocument' |
  'onAwarenessUpdate' |
  'onRequest' |
  'onDisconnect' |
  'beforeUnloadDocument' |
  'afterUnloadDocument' |
  'onDestroy'

export type HookPayloadByName = {
  onConfigure: onConfigurePayload,
  onListen: onListenPayload,
  onUpgrade: onUpgradePayload,
  onConnect: onConnectPayload,
  connected: connectedPayload,
  onAuthenticate: onAuthenticatePayload,
  onCreateDocument: onCreateDocumentPayload
  onLoadDocument: onLoadDocumentPayload,
  afterLoadDocument: afterLoadDocumentPayload,
  beforeHandleMessage: beforeHandleMessagePayload,
  beforeBroadcastStateless: beforeBroadcastStatelessPayload,
  onStateless: onStatelessPayload,
  onChange: onChangePayload,
  onStoreDocument: onStoreDocumentPayload,
  afterStoreDocument: afterStoreDocumentPayload,
  onAwarenessUpdate: onAwarenessUpdatePayload,
  onRequest: onRequestPayload,
  onDisconnect: onDisconnectPayload,
  afterUnloadDocument: afterUnloadDocumentPayload,
  beforeUnloadDocument: beforeUnloadDocumentPayload,
  onDestroy: onDestroyPayload,
}
export interface Configuration extends Extension {
  /**
   * A name for the instance, used for logging.
   */
  name: string | null,
  /**
   * A list of hocuspocus extensions.
   */
  extensions: Array<Extension>,
  /**
   * The port which the server listens on.
   */
  port?: number,
  /**
   * The address which the server listens on.
   */
  address?: string,
  /**
   * Defines in which interval the server sends a ping, and closes the connection when no pong is sent back.
   */
  timeout: number,
  /**
   * Debounces the call of the `onStoreDocument` hook for the given amount of time in ms.
   * Otherwise every single update would be persisted.
   */
  debounce: number,
  /**
   * Makes sure to call `onStoreDocument` at least in the given amount of time (ms).
   */
  maxDebounce: number
  /**
   * By default, the servers show a start screen. If passed false, the server will start quietly.
   */
  quiet: boolean,
  /**
   * If set to false, respects the debounce time of `onStoreDocument` before unloading a document.
   * Otherwise, the document will be unloaded immediately.
   *
   * This prevents a client from DOSing the server by repeatedly connecting and disconnecting when
   * your onStoreDocument is rate-limited.
   */
  unloadImmediately: boolean,

  /**
   * the server will gracefully stop if SIGINT, SIGQUIT or SIGTERM is received.
   *
   * Set this to false if you don't want that.
   */
  stopOnSignals: boolean,

  /**
   * options to pass to the ydoc document
   */
  yDocOptions: {
    gc: boolean, // enable or disable garbage collection (see https://github.com/yjs/yjs/blob/main/INTERNALS.md#deletions)
    gcFilter: () => boolean, // will be called before garbage collecting ; return false to keep it
  },

}

export interface onStatelessPayload {
  connection: Connection,
  documentName: string,
  document: Document,
  payload: string,
}

// @todo Change 'connection' to 'connectionConfig' in next major release
// see https://github.com/ueberdosis/hocuspocus/pull/607#issuecomment-1553559805
export interface onAuthenticatePayload {
  context: any,
  documentName: string,
  instance: Hocuspocus,
  requestHeaders: IncomingHttpHeaders,
  requestParameters: URLSearchParams,
  request: IncomingMessage,
  socketId: string,
  token: string,
  connection: ConnectionConfiguration
}

// @todo Change 'connection' to 'connectionConfig' in next major release
// see https://github.com/ueberdosis/hocuspocus/pull/607#issuecomment-1553559805
export interface onCreateDocumentPayload {
  context: any
  documentName: string
  instance: Hocuspocus
  requestHeaders: IncomingHttpHeaders
  requestParameters: URLSearchParams
  socketId: string
  connection: ConnectionConfiguration
}

// @todo Change 'connection' to 'connectionConfig' in next major release
// see https://github.com/ueberdosis/hocuspocus/pull/607#issuecomment-1553559805
export interface onConnectPayload {
  context: any,
  documentName: string,
  instance: Hocuspocus,
  request: IncomingMessage,
  requestHeaders: IncomingHttpHeaders,
  requestParameters: URLSearchParams,
  socketId: string,
  connection: ConnectionConfiguration
}

// @todo Change 'connection' to 'connectionConfig', and 'connectionInstance' to 'connection' in next major release
// see https://github.com/ueberdosis/hocuspocus/pull/607#issuecomment-1553559805
export interface connectedPayload {
  context: any,
  documentName: string,
  instance: Hocuspocus,
  request: IncomingMessage,
  requestHeaders: IncomingHttpHeaders,
  requestParameters: URLSearchParams,
  socketId: string,
  connection: ConnectionConfiguration,
  connectionInstance: Connection
}

// @todo Change 'connection' to 'connectionConfig' in next major release
// see https://github.com/ueberdosis/hocuspocus/pull/607#issuecomment-1553559805
export interface onLoadDocumentPayload {
  context: any,
  document: Document,
  documentName: string,
  instance: Hocuspocus,
  requestHeaders: IncomingHttpHeaders,
  requestParameters: URLSearchParams,
  socketId: string,
  connection: ConnectionConfiguration
}

// @todo Change 'connection' to 'connectionConfig' in next major release
// see https://github.com/ueberdosis/hocuspocus/pull/607#issuecomment-1553559805
export interface afterLoadDocumentPayload {
  context: any,
  document: Document,
  documentName: string,
  instance: Hocuspocus,
  requestHeaders: IncomingHttpHeaders,
  requestParameters: URLSearchParams,
  socketId: string,
  connection: ConnectionConfiguration
}

export interface onChangePayload {
  clientsCount: number,
  context: any,
  document: Document,
  documentName: string,
  instance: Hocuspocus,
  requestHeaders: IncomingHttpHeaders,
  requestParameters: URLSearchParams,
  update: Uint8Array,
  socketId: string,
  transactionOrigin: any,
}

export interface beforeHandleMessagePayload {
  clientsCount: number,
  context: any,
  document: Document,
  documentName: string,
  instance: Hocuspocus,
  requestHeaders: IncomingHttpHeaders,
  requestParameters: URLSearchParams,
  update: Uint8Array,
  socketId: string,
  connection: Connection
}

export interface beforeBroadcastStatelessPayload {
  document: Document,
  documentName: string,
  payload: string,
}

export interface onStoreDocumentPayload {
  clientsCount: number,
  context: any,
  document: Document,
  documentName: string,
  instance: Hocuspocus,
  requestHeaders: IncomingHttpHeaders,
  requestParameters: URLSearchParams,
  socketId: string,
  transactionOrigin?: any,
}

export interface afterStoreDocumentPayload extends onStoreDocumentPayload {}

export interface onAwarenessUpdatePayload {
  context: any,
  document: Document,
  documentName: string,
  instance: Hocuspocus,
  requestHeaders: IncomingHttpHeaders,
  requestParameters: URLSearchParams,
  socketId: string,
  added: number[],
  updated: number[],
  removed: number[],
  awareness: Awareness,
  states: StatesArray,
}

export type StatesArray = { clientId: number, [key: string | number]: any }[]

// @todo Change 'connection' to 'connectionConfig' in next major release
// see https://github.com/ueberdosis/hocuspocus/pull/607#issuecomment-1553559805
export interface fetchPayload {
  context: any,
  document: Document,
  documentName: string,
  instance: Hocuspocus,
  requestHeaders: IncomingHttpHeaders,
  requestParameters: URLSearchParams,
  socketId: string,
  connection: ConnectionConfiguration
}

export interface storePayload extends onStoreDocumentPayload {
  state: Buffer,
}

export interface onDisconnectPayload {
  clientsCount: number,
  context: any,
  document: Document,
  documentName: string,
  instance: Hocuspocus,
  requestHeaders: IncomingHttpHeaders,
  requestParameters: URLSearchParams,
  socketId: string,
}

export interface onRequestPayload {
  request: IncomingMessage,
  response: ServerResponse,
  instance: Hocuspocus,
}

export interface onUpgradePayload {
  request: IncomingMessage,
  socket: any,
  head: any,
  instance: Hocuspocus,
}

export interface onListenPayload {
  instance: Hocuspocus,
  configuration: Configuration,
  port: number,
}

export interface onDestroyPayload {
  instance: Hocuspocus,
}

export interface onConfigurePayload {
  instance: Hocuspocus,
  configuration: Configuration,
  version: string,
}

export interface afterUnloadDocumentPayload {
  instance: Hocuspocus;
  documentName: string;
}

export interface beforeUnloadDocumentPayload {
  instance: Hocuspocus;
  documentName: string;
}

export interface DirectConnection {
  transact(transaction: (document: Document) => void): Promise<void>,
  disconnect(): void
}
