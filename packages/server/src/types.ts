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
  onChange(data: onChangePayload): void,
  onConnect(data: onConnectPayload, resolve: Function, reject: Function): void,
  onCreateDocument(data: onCreateDocumentPayload, resolve: Function, reject: Function): void,
  onDestroy(data: onDestroyPayload, resolve: Function, reject: Function): void,
  onDisconnect(data: onDisconnectPayload): void
  onListen(data: onListenPayload, resolve: Function, reject: Function): void,
  onRequest(data: onRequestPayload, resolve: Function, reject: Function): void,
  onUpgrade(data: onUpgradePayload, resolve: Function, reject: Function): void,
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
