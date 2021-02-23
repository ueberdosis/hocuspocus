import {
  IncomingHttpHeaders, IncomingMessage, ServerResponse,
} from 'http'
import { URLSearchParams } from 'url'
import { Socket } from 'net'
import Document from './Document'

export enum MessageTypes {
  Sync = 0,
  Awareness = 1,
}

export enum WsReadyStates {
  Closing = 2,
  Closed = 3,
}

export interface AwarenessUpdate {
  added: Array<any>,
  updated: Array<any>,
  removed: Array<any>,
}

export interface Extension {
  onChange(data: onChangePayload): Promise<void>,
  onConnect(data: onConnectPayload): Promise<void>,
  onCreateDocument(data: onCreateDocumentPayload): Promise<void>,
  onDestroy(data: onDestroyPayload): Promise<void>,
  onDisconnect(data: onDisconnectPayload): Promise<void>
  onListen(data: onListenPayload): Promise<void>,
  onRequest(data: onRequestPayload): Promise<void>,
  onUpgrade(data: onUpgradePayload): Promise<void>,
}

export interface Configuration extends Extension {
  extensions: Array<Extension>,
  port: number | null,
  timeout: number,
}

export interface onCreateDocumentPayload {
  document: Document,
  documentName: string,
}

export interface onConnectPayload extends onCreateDocumentPayload {
  requestHeaders: IncomingHttpHeaders,
  requestParameters: URLSearchParams,
  clientsCount: number,
}

export interface onChangePayload extends onConnectPayload {
  update: Uint8Array,
}

export interface onDisconnectPayload extends onConnectPayload {
  context: any,
}

export interface onRequestPayload {
  request: IncomingMessage,
  response: ServerResponse,
}

export interface onUpgradePayload {
  head: any,
  request: IncomingMessage,
  socket: Socket,
}

export interface onListenPayload {
  port: number,
}

export interface onDestroyPayload {
}
