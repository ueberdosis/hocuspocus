import { Server as HTTPServer } from 'http'

export interface Configuration {
  debounce: number,
  debounceMaxWait: number,
  httpServer: HTTPServer,
  persistence: any,
  port: number,
  timeout: number,
  onChange: (data: any) => void,
  onConnect: (data: any, resolve: Function, reject: Function) => void,
  onDisconnect: (data: any) => void,
  onJoinDocument: (data: any, resolve: Function, reject: Function) => void,
}
