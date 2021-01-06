import { IncomingHttpHeaders, Server as HTTPServer } from 'http'
import { URLSearchParams } from 'url'
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

export interface Configuration {
  debounce: number,
  debounceMaxWait: number,
  httpServer: HTTPServer,
  onChange: (data: onChangePayload) => void,
  onConnect: (data: onConnectPayload, resolve: Function, reject: Function) => void,
  onDisconnect: (data: onDisconnectPayload) => void,
  onJoinDocument: (data: onJoinDocumentPayload, resolve: Function, reject: Function) => void,
  persistence: any,
  port: number,
  timeout: number,
}

export interface onConnectPayload {
  requestHeaders: IncomingHttpHeaders,
  requestParameters: URLSearchParams,
}

export interface onChangePayload extends onConnectPayload {
  clientsCount: number,
  document: Document,
  documentName: string,
}

export interface onDisconnectPayload extends onChangePayload {
  context: any,
}

export interface onJoinDocumentPayload extends onDisconnectPayload {}
