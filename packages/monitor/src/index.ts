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
} from '@hocuspocus/server'
import { IncomingMessage, ServerResponse } from 'http'
import WebSocket from 'ws'
import { Storage } from './Storage'
import { RocksDB } from './RocksDB'
import { Dashboard } from './Dashboard'
import { Collector } from './Collector'

export interface Configuration {
  dashboardPath: string,
  enableDashboard: boolean,
  enableStorage: boolean,
  osMetricsInterval: number,
  port: number | undefined,
  storagePath: string,
}

export class Monitor implements Extension {

  configuration: Configuration = {
    dashboardPath: 'dashboard',
    enableDashboard: true,
    enableStorage: false,
    osMetricsInterval: 10000,
    port: undefined,
    storagePath: './dashboard',
  }

  storage: Storage

  collector: Collector

  dashboard?: Dashboard

  /**
   * Constructor
   */
  constructor(configuration?: Partial<Configuration>) {

    this.configuration = {
      ...this.configuration,
      ...configuration,
    }

    const { storagePath } = this.configuration

    this.collector = new Collector()
    this.storage = new Storage()

    // TODO: fix rocksdb
    // if (this.configuration.enableStorage) {
    // this.storage = new RocksDB({ storagePath, interval })
    // } else {
    // }

    if (this.configuration.enableDashboard) {
      this.dashboard = new Dashboard({
        collector: this.collector,
        path: this.configuration.dashboardPath,
        port: this.configuration.port,
        storage: this.storage,
      })
    }

    setInterval(this.collectOsMetrics.bind(this), this.configuration.osMetricsInterval)
    this.collectOsMetrics()
  }

  /*
   * Collect metrics
   */

  private async collectOsMetrics() {
    await this.storage.add('memory', await this.collector.memory())
    await this.storage.add('cpu', await this.collector.cpu())
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
    await this.storage.add('connections', this.collector.connect(data))
  }

  async onDisconnect(data: onDisconnectPayload) {
    await this.storage.add('connections', this.collector.disconnect(data))
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function,no-empty-function
  async onCreateDocument(data: onCreateDocumentPayload) {
    await this.storage.add('documents', this.collector.createDocument(data))
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
    this.collector.serverConfiguration = {
      port: data.configuration.port,
      timeout: data.configuration.timeout,
    }
  }
}
