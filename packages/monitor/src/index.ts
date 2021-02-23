import {
  Extension,
  onChangePayload,
  onConnectPayload,
  onCreateDocumentPayload, onDestroyPayload,
  onDisconnectPayload, onListenPayload, onRequestPayload,
  onUpgradePayload,
} from '@hocuspocus/server'
import { IncomingMessage, ServerResponse } from 'http'
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
      const { dashboardPath } = this.configuration
      this.dashboard = new Dashboard({ path: dashboardPath })
    }
  }

  handleRequest(request: IncomingMessage, response: ServerResponse) {
    return this.dashboard?.handleRequest(request, response)
  }

  async onConnect(data: onConnectPayload) {
    await this.storage.increment('connectionCount')
  }

  async onDisconnect(data: onDisconnectPayload) {
    await this.storage.decrement('connectionCount')
  }

  onRequest(data: onRequestPayload): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.handleRequest(data.request, data.response)) {
        reject()
      } else {
        resolve()
      }
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function,no-empty-function
  async onCreateDocument(data: onCreateDocumentPayload) {
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function,no-empty-function
  async onChange(data: onChangePayload) {
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function,no-empty-function
  async onUpgrade(data: onUpgradePayload) {
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function,no-empty-function
  async onListen(data: onListenPayload) {
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function,no-empty-function
  async onDestroy(data: onDestroyPayload) {
  }
}
