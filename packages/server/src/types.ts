import {
  IncomingHttpHeaders, IncomingMessage, ServerResponse,
} from 'http'
import { URLSearchParams } from 'url'
import { Socket } from 'net'
import Document from './Document'
import { Hocuspocus } from './Hocuspocus'

export enum MessageType {
  Unknown = -1,
  Sync = 0,
  Awareness = 1,
  Auth = 2,
}

/**
 * State of the WebSocket connection.
 * https://developer.mozilla.org/de/docs/Web/API/WebSocket/readyState
 */
export enum WsReadyStates {
  Connecting = 0,
  Open = 1,
  Closing = 2,
  Closed = 3,
}

export interface AwarenessUpdate {
  added: Array<any>,
  updated: Array<any>,
  removed: Array<any>,
}

export interface ConnectionConfig {
  readOnly: boolean
  isAuthenticated: boolean
}

export interface Extension {
  onAuthenticate?(data: onAuthenticatePayload): Promise<any>,
  onChange?(data: onChangePayload): Promise<any>,
  onConnect?(data: onConnectPayload): Promise<any>,
  onConfigure?(data: onConfigurePayload): Promise<any>,
  /**
   * @deprecated onCreateDocument is deprecated, use onLoadDocument instead
   */
  onCreateDocument?(data: onLoadDocumentPayload): Promise<any>,
  onLoadDocument?(data: onLoadDocumentPayload): Promise<any>,
  onDestroy?(data: onDestroyPayload): Promise<any>,
  onDisconnect?(data: onDisconnectPayload): Promise<any>
  onListen?(data: onListenPayload): Promise<any>,
  onRequest?(data: onRequestPayload): Promise<any>,
  onUpgrade?(data: onUpgradePayload): Promise<any>,
}

export interface Configuration extends Extension {
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
}

export interface onAuthenticatePayload {
  documentName: string,
  instance: Hocuspocus,
  requestHeaders: IncomingHttpHeaders,
  requestParameters: URLSearchParams,
  socketId: string,
  token: string,
  connection: ConnectionConfig
}

export interface onConnectPayload {
  documentName: string,
  instance: Hocuspocus,
  request: IncomingMessage,
  requestHeaders: IncomingHttpHeaders,
  requestParameters: URLSearchParams,
  socketId: string,
  connection: ConnectionConfig
}

export interface onLoadDocumentPayload {
  context: any,
  document: Document,
  documentName: string,
  instance: Hocuspocus,
  requestHeaders: IncomingHttpHeaders,
  requestParameters: URLSearchParams,
  socketId: string,
  connection: ConnectionConfig
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

export interface CloseEvent {
  code: number,
  reason: string,
}
