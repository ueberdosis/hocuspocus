import {
  Extension,
  onChangePayload,
  onConnectPayload,
  onCreateDocumentPayload,
  onDisconnectPayload, onRequestPayload,
  onUpgradePayload,
} from '@hocuspocus/server'
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

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  onCreateDocument(data: onCreateDocumentPayload, resolve: Function): void {
    resolve()
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  onChange(data: onChangePayload): void {
  }

  onConnect(data: onConnectPayload, resolve: Function): void {
    this.storage.increment('connectionCount')

    resolve()
  }

  onDisconnect(data: onDisconnectPayload): void {
    this.storage.decrement('connectionCount')
  }

  onUpgrade(data: onUpgradePayload, resolve: Function): void {
    resolve()
  }

  onRequest(data: onRequestPayload, resolve: Function, reject: Function): void {
    const interrupt = this.dashboard?.handleRequest(data.request, data.response)

    if (interrupt) {
      reject()
    } else {
      resolve()
    }
  }
}
