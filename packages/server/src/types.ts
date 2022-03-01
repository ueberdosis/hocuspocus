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
  /**
   * @deprecated onCreateDocument is deprecated, use onLoadDocument instead
   */
  onCreateDocument?(data: onLoadDocumentPayload): Promise<any>,
  onLoadDocument?(data: onLoadDocumentPayload): Promise<any>,
  afterLoadDocument?(data: onLoadDocumentPayload): Promise<any>,
  onChange?(data: onChangePayload): Promise<any>,
  onStoreDocument?(data: onStoreDocumentPayload): Promise<any>,
  afterStoreDocument?(data: afterStoreDocumentPayload): Promise<any>,
  onAwarenessUpdate?(data: onAwarenessUpdatePayload): Promise<any>,
  onRequest?(data: onRequestPayload): Promise<any>,
  onDisconnect?(data: onDisconnectPayload): Promise<any>
  onDestroy?(data: onDestroyPayload): Promise<any>,
}

export type Hook =
  'onConfigure' |
  'onListen' |
  'onUpgrade' |
  'onConnect' |
  'connected' |
  'onAuthenticate' |
  /**
   * @deprecated onCreateDocument is deprecated, use onLoadDocument instead
   */
  'onCreateDocument' |
  'onLoadDocument' |
  'afterLoadDocument' |
  'onChange' |
  'onStoreDocument' |
  'afterStoreDocument' |
  'onAwarenessUpdate' |
  'onRequest' |
  'onDisconnect' |
  'onDestroy'

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
  port: number | null,
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
  head: any,
  request: IncomingMessage,
  socket: Socket,
  instance: Hocuspocus,
}

export interface onListenPayload {
  port: number,
}

export interface onDestroyPayload {
  instance: Hocuspocus,
}

export interface onConfigurePayload {
  configuration: Configuration,
  version: string,
  yjsVersion: string,
  instance: Hocuspocus,
}
