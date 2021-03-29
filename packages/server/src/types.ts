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
  onChange(data: onChangePayload): Promise<any>,
  onConnect(data: onConnectPayload): Promise<any>,
  onConfigure(data: onConfigurePayload): Promise<any>,
  onCreateDocument(data: onCreateDocumentPayload): Promise<any>,
  onDestroy(data: onDestroyPayload): Promise<any>,
  onDisconnect(data: onDisconnectPayload): Promise<any>
  onListen(data: onListenPayload): Promise<any>,
  onRequest(data: onRequestPayload): Promise<any>,
  onUpgrade(data: onUpgradePayload): Promise<any>,
}

export interface Configuration extends Extension {
  banTime: number,
  extensions: Array<Extension>,
  port: number | null,
  throttle: number | null | false,
  timeout: number,
}

export interface onConnectPayload {
  documentName: string,
  requestHeaders: IncomingHttpHeaders,
  requestParameters: URLSearchParams,
  socketId: string,
}

export interface onCreateDocumentPayload {
  context: any,
  document: Document,
  documentName: string,
  socketId: string,
}

export interface onChangePayload {
  clientsCount: number,
  context: any,
  document: Document,
  documentName: string,
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
  requestHeaders: IncomingHttpHeaders,
  requestParameters: URLSearchParams,
  socketId: string,
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

export interface onConfigurePayload {
  configuration: Configuration,
  version: string,
  yjsVersion: string,
}
