import {
  Extension,
  onChangePayload,
  onConnectPayload,
  onCreateDocumentPayload,
  onDisconnectPayload,
  onListenPayload,
  onUpgradePayload,
} from '@hocuspocus/server'
import { Storage } from './Storage'
import { Dashboard } from './Dashboard'

export interface Configuration {
  dashboardPath: string,
  enableDashboard: boolean,
  interval: number,
  storagePath: string,
}

export class Monitor implements Extension {

  configuration: Configuration = {
    dashboardPath: '/dashboard',
    enableDashboard: true,
    interval: 5,
    storagePath: './dashboard',
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

  onListen(data: onListenPayload, resolve: Function): void {
    resolve()
  }

  onUpgrade(data: onUpgradePayload, resolve: Function): void {
    resolve()
  }
}
