import {
  Extension,
  onChangePayload,
  onConnectPayload,
  onCreateDocumentPayload, onDestroyPayload,
  onDisconnectPayload, onListenPayload, onRequestPayload,
  onUpgradePayload,
} from '@hocuspocus/server'
import { IncomingMessage, ServerResponse } from 'http'
import WebSocket from 'ws'
import { Storage } from './Storage'
import { Dashboard } from './Dashboard'

export interface Configuration {
  dashboardPath: string,
  enableDashboard: boolean,
  interval: number,
  storagePath: string,
  port: number | undefined,
}

export class Monitor implements Extension {

  configuration: Configuration = {
    dashboardPath: 'dashboard',
    enableDashboard: true,
    interval: 5,
    storagePath: './dashboard',
    port: undefined,
  }

  storage: Storage

  dashboard?: Dashboard

  /**
   * Constructor
   */

  constructor(configuration?: Partial<Configuration>) {
    this.configuration = {
      ...this.configuration,
      ...configuration,
    }

    const { storagePath, interval } = this.configuration
    this.storage = new Storage({ storagePath, interval })

    if (this.configuration.enableDashboard) {
      const { dashboardPath, port } = this.configuration
      this.dashboard = new Dashboard({ path: dashboardPath, port })
    }
  }

  /*
   * Public API
   */

  handleRequest(request: IncomingMessage, response: ServerResponse) {
    return this.dashboard?.handleRequest(request, response)
  }

  handleConnection(websocket: WebSocket, request: IncomingMessage) {
    return this.dashboard?.handleConnection(websocket, request)
  }

  /*
   * Hooks
   */

  onRequest({ request, response }: onRequestPayload): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.configuration.port && this.handleRequest(request, response)) {
        reject()
      } else {
        resolve()
      }
    })
  }

  onUpgrade({ request, socket, head }: onUpgradePayload): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.configuration.port && this.dashboard?.handleUpgrade(request, socket, head)) {
        reject()
      } else {
        resolve()
      }
    })
  }

  async onConnect(data: onConnectPayload) {
    await this.storage.increment('connectionCount')
  }

  async onDisconnect(data: onDisconnectPayload) {
    await this.storage.decrement('connectionCount')
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function,no-empty-function
  async onCreateDocument(data: onCreateDocumentPayload) {
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function,no-empty-function
  async onChange(data: onChangePayload) {
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function,no-empty-function
  async onListen(data: onListenPayload) {
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function,no-empty-function
  async onDestroy(data: onDestroyPayload) {
  }
}
