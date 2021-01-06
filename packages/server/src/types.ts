import { IncomingHttpHeaders, Server as HTTPServer } from 'http'
import { URLSearchParams } from 'url'

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

export interface onDisconnectPayload extends onConnectPayload {
  clientsCount: number,
  document: any,
  documentName: string,
}

export interface onJoinDocumentPayload extends onDisconnectPayload {
  context: any,
}

export interface onChangePayload extends onDisconnectPayload {}
