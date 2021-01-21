import { Doc } from 'yjs'
import { IncomingHttpHeaders } from 'http'
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

export interface Persistence {
  connect(documentName: string, document: Doc): Promise<any>,
  store(documentName: string, update: Uint8Array): Promise<any>,
}

export interface Configuration {
  debounce: number,
  debounceMaxWait: number,
  onChange: (data: onChangePayload) => void,
  onConnect: (data: onConnectPayload, resolve: Function, reject: Function) => void,
  onDisconnect: (data: onDisconnectPayload) => void,
  persistence: Persistence | null,
  port: number | null,
  timeout: number,
  external: boolean | null,
}

export interface onConnectPayload {
  requestHeaders: IncomingHttpHeaders,
  requestParameters: URLSearchParams,
  clientsCount: number,
  document: Document,
  documentName: string,
}

export interface onChangePayload extends onConnectPayload {}

export interface onDisconnectPayload extends onChangePayload {
  context: any,
}
