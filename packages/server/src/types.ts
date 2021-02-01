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

export interface Extension {
  onConnect(data: onConnectPayload, resolve: Function, reject: Function): void,
  onChange(data: onChangePayload): void,
  onDisconnect(data: onDisconnectPayload): void
}

export interface Configuration extends Extension {
  debounce: number,
  debounceMaxWait: number,
  extensions: Array<Extension>,
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

export interface onChangePayload extends onConnectPayload {
  update: Uint8Array,
}

export interface onDisconnectPayload extends onConnectPayload {
  context: any,
}
