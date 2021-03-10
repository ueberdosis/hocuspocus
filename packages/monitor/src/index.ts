import {
  defaultConfiguration,
  Extension,
  onChangePayload,
  onConfigurePayload,
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
import moment from 'moment'
import { Storage } from './Storage'
import { Dashboard } from './Dashboard'
import { Collector } from './Collector'

export interface Configuration {
  dashboardPath: string,
  enableDashboard: boolean,
  metricsInterval: number,
  osMetricsInterval: number,
  password: string | undefined,
  port: number | undefined,
  user: string | undefined,
}

export class Monitor implements Extension {

  configuration: Configuration = {
    dashboardPath: 'dashboard',
    enableDashboard: true,
    metricsInterval: 10000,
    osMetricsInterval: 10000,
    password: undefined,
    port: undefined,
    user: undefined,
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

    this.collector = new Collector()
    this.storage = new Storage()

    if (this.configuration.enableDashboard) {
      this.dashboard = new Dashboard({
        password: this.configuration.password,
        path: this.configuration.dashboardPath,
        port: this.configuration.port,
        storage: this.storage,
        user: this.configuration.user,
      })
    }

    setInterval(this.collectOsMetrics.bind(this), this.configuration.osMetricsInterval)
    setInterval(this.collectConnectionMetrics.bind(this), this.configuration.metricsInterval)
    setInterval(this.cleanMetrics.bind(this), 60000)

    this.collectOsMetrics()
    this.collectConnectionMetrics()
  }

  /*
   * Collect metrics
   */

  private async collectOsMetrics() {
    await this.storage.add('memory', await this.collector.memory())
    await this.storage.add('cpu', await this.collector.cpu())
  }

  private async collectConnectionMetrics() {
    await this.storage.add('documentCount', await this.collector.documentCount())
    await this.storage.add('connectionCount', await this.collector.connectionCount())
    await this.storage.add('messageCount', await this.collector.messageCount())
    await this.storage.set('documents', await this.collector.documents())
    await this.storage.set('info', await this.collector.info())
  }

  private async cleanMetrics() {
    const data = await this.storage.allTimed()

    for (let i = 0; i < data.length; i += 1) {
      if (moment(data[i].timestamp).add(1, 'hour').isBefore(moment())) {
        // eslint-disable-next-line no-await-in-loop
        await this.storage.remove(data[i].key, data[i].timestamp)
      }
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
    await this.storage.add('connectionLog', this.collector.connect(data))
  }

  async onDisconnect(data: onDisconnectPayload) {
    await this.storage.add('connectionLog', this.collector.disconnect(data))
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function,no-empty-function
  async onCreateDocument(data: onCreateDocumentPayload) {
    await this.storage.add('documentLog', this.collector.createDocument(data))
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function,no-empty-function
  async onChange(data: onChangePayload) {
    await this.storage.add('documentLog', this.collector.changeDocument(data))
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function,no-empty-function
  async onListen(data: onListenPayload) {
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function,no-empty-function
  async onDestroy(data: onDestroyPayload) {
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function,no-empty-function
  async onConfigure(data: onConfigurePayload) {
    this.collector.version = data.version
    this.collector.yjsVersion = data.yjsVersion

    const sanitizedConfiguration = {}

    Object.keys(defaultConfiguration).forEach(key => {
      // @ts-ignore
      sanitizedConfiguration[key] = data.configuration[key] || null
    })

    this.collector.serverConfiguration = sanitizedConfiguration
  }
}
