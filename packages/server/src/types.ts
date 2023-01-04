import {
  IncomingHttpHeaders, IncomingMessage, ServerResponse,
} from 'http'
import { URLSearchParams } from 'url'
import { Socket } from 'net'
import { Awareness } from 'y-protocols/awareness'
import Document from './Document'
import { Hocuspocus } from './Hocuspocus'

export enum MessageType {
  Unknown = -1,
  Sync = 0,
  Awareness = 1,
  Auth = 2,
  QueryAwareness = 3,
  SyncReply = 4, // same as Sync, but won't trigger another 'SyncStep1'
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
  priority?: number,
  onConfigure?(data: onConfigurePayload): Promise<any>,
  onListen?(data: onListenPayload): Promise<any>,
  onUpgrade?(data: onUpgradePayload): Promise<any>,
  onConnect?(data: onConnectPayload): Promise<any>,
  connected?(data: connectedPayload): Promise<any>,
  onAuthenticate?(data: onAuthenticatePayload): Promise<any>,
  onLoadDocument?(data: onLoadDocumentPayload): Promise<any>,
  afterLoadDocument?(data: onLoadDocumentPayload): Promise<any>,
  beforeHandleMessage?(data: beforeHandleMessagePayload): Promise<any>,
  onChange?(data: onChangePayload): Promise<any>,
  onStoreDocument?(data: onStoreDocumentPayload): Promise<any>,
  afterStoreDocument?(data: afterStoreDocumentPayload): Promise<any>,
  onAwarenessUpdate?(data: onAwarenessUpdatePayload): Promise<any>,
  onRequest?(data: onRequestPayload): Promise<any>,
  onDisconnect?(data: onDisconnectPayload): Promise<any>
  onDestroy?(data: onDestroyPayload): Promise<any>,
}

export type HookName =
  'onConfigure' |
  'onListen' |
  'onUpgrade' |
  'onConnect' |
  'connected' |
  'onAuthenticate' |
  'onLoadDocument' |
  'afterLoadDocument' |
  'beforeHandleMessage' |
  'onChange' |
  'onStoreDocument' |
  'afterStoreDocument' |
  'onAwarenessUpdate' |
  'onRequest' |
  'onDisconnect' |
  'onDestroy'

export type HookPayload =
  onConfigurePayload |
  onListenPayload |
  onUpgradePayload |
  onConnectPayload |
  connectedPayload |
  onAuthenticatePayload |
  onLoadDocumentPayload |
  onChangePayload |
  onStoreDocumentPayload |
  afterStoreDocumentPayload |
  onAwarenessUpdatePayload |
  onRequestPayload |
  onDisconnectPayload |
  onDestroyPayload

export interface Configuration extends Extension {
  /**
   * A name for the instance, used for logging.
   */
  name: string | null,
  /**
   * A list of hocuspocus extenions.
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
   * options to pass to the ydoc document
   */
  yDocOptions: {
    gc: boolean, // enable or disable garbage collection (see https://github.com/yjs/yjs/blob/main/INTERNALS.md#deletions)
    gcFilter: () => boolean, // will be called before garbage collecting ; return false to keep it
  },
  /**
   * Function which returns the (customized) document name based on the request
   */
  getDocumentName?(data: getDocumentNamePayload): string | Promise<string>,
}

export interface getDocumentNamePayload {
  documentName: string,
  request: IncomingMessage,
  requestParameters: URLSearchParams,
}

export interface onAuthenticatePayload {
  documentName: string,
  instance: Hocuspocus,
  requestHeaders: IncomingHttpHeaders,
  requestParameters: URLSearchParams,
  socketId: string,
  token: string,
  connection: ConnectionConfiguration
}

export interface onConnectPayload {
  documentName: string,
  instance: Hocuspocus,
  request: IncomingMessage,
  requestHeaders: IncomingHttpHeaders,
  requestParameters: URLSearchParams,
  socketId: string,
  connection: ConnectionConfiguration
}

export interface connectedPayload {
  documentName: string,
  instance: Hocuspocus,
  request: IncomingMessage,
  requestHeaders: IncomingHttpHeaders,
  requestParameters: URLSearchParams,
  socketId: string,
  connection: ConnectionConfiguration
}

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
}

export interface afterStoreDocumentPayload extends onStoreDocumentPayload {}

export interface onAwarenessUpdatePayload {
  clientsCount: number,
  context: any,
  document: Document,
  documentName: string,
  instance: Hocuspocus,
  requestHeaders: IncomingHttpHeaders,
  requestParameters: URLSearchParams,
  update: Uint8Array,
  socketId: string,
  added: number[],
  updated: number[],
  removed: number[],
  awareness: Awareness,
  states: StatesArray,
}

export type StatesArray = { clientId: number, [key: string | number]: any }[]

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
