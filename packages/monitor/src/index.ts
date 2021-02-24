import {
  Extension,
  onChangePayload, onConfigurePayload,
  onConnectPayload,
  onCreateDocumentPayload,
  onDestroyPayload,
  onDisconnectPayload,
  onListenPayload,
  onRequestPayload,
  onUpgradePayload,
  defaultConfiguration,
} from '@hocuspocus/server'
import { IncomingMessage, ServerResponse } from 'http'
import osu from 'node-os-utils'
import WebSocket from 'ws'
import { Storage } from './Storage'
import { RocksDB } from './RocksDB'
import { Dashboard } from './Dashboard'

export interface Configuration {
  dashboardPath: string,
  enableDashboard: boolean,
  enableStorage: boolean,
  interval: number,
  port: number | undefined,
  storagePath: string,
}

export class Monitor implements Extension {

  configuration: Configuration = {
    dashboardPath: 'dashboard',
    enableDashboard: true,
    enableStorage: false,
    interval: 1,
    port: undefined,
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

    this.storage = new Storage({ interval })
    // if (this.configuration.enableStorage) {
    // TODO: fix rocksdb
    // this.storage = new RocksDB({ storagePath, interval })
    // } else {
    // }

    if (this.configuration.enableDashboard) {
      this.dashboard = new Dashboard({
        path: this.configuration.dashboardPath,
        port: this.configuration.port,
        storage: this.storage,
        serverConfiguration: defaultConfiguration,
      })
    }

    setInterval(this.collectOsMetrics.bind(this), 5000)
  }

  private async collectOsMetrics() {
    const memory = await osu.mem.info()

    await this.storage.setTimedValue('memory', {
      usage: 100 - memory.freeMemPercentage,
      free: memory.freeMemMb,
      total: memory.totalMemMb,
    }, true)

    await this.storage.setTimedValue('cpu', {
      usage: await osu.cpu.usage(),
      count: osu.cpu.count(),
    }, true)
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
    // await this.storage.increment('connectionCount')
  }

  async onDisconnect(data: onDisconnectPayload) {
    // await this.storage.decrement('connectionCount')
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

  // eslint-disable-next-line @typescript-eslint/no-empty-function,no-empty-function
  async onConfigure(data: onConfigurePayload) {
    if (this.dashboard) {
      this.dashboard.configuration.serverConfiguration = {
        port: data.configuration.port,
        timeout: data.configuration.timeout,
      }
    }
  }
}
