import { createHmac } from 'crypto'
import {
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
import { Doc } from 'yjs'
import { TiptapTransformer, Transformer } from '@hocuspocus/transformer'
import axios, { AxiosResponse } from 'axios'
import Timeout = NodeJS.Timeout

export enum Events {
  Change = 'change',
  Connect = 'connect',
  Create = 'create',
  Disconnect = 'disconnect',
}

export interface Configuration {
  debounce: number | false | null,
  debounceMaxWait: number,
  secret: string,
  transformer: Transformer | {
    toYdoc: (document: any) => Doc,
    fromYdoc: (document: Doc) => any,
  },
  url: string,
  events: Array<Events>,
  paths: {
    change: string,
    connect: string,
    create: string,
    disconnect: string,
  },
}

export class Webhook implements Extension {

  configuration: Configuration = {
    debounce: 2000,
    debounceMaxWait: 10000,
    secret: '',
    transformer: TiptapTransformer,
    url: '',
    events: [
      Events.Change,
    ],
    paths: {
      change: 'change',
      connect: 'connect',
      create: 'create',
      disconnect: 'disconnect',
    },
  }

  debounced: Map<string, { timeout: Timeout, start: number }> = new Map()

  /**
   * Constructor
   */
  constructor(configuration?: Partial<Configuration>) {
    this.configuration = {
      ...this.configuration,
      ...configuration,
    }

    if (!this.configuration.url) {
      throw new Error('url is required!')
    }
  }

  /**
   * Create a signature for the response body
   */
  createSignature(body: string): string {
    const hmac = createHmac('sha256', this.configuration.secret)

    return `sha256=${hmac.update(body).digest('hex')}`
  }

  /**
   * debounce the given function, using the given identifier
   */
  debounce(id: string, func: Function) {
    const old = this.debounced.get(id)
    const start = old?.start || Date.now()

    const run = () => {
      this.debounced.delete(id)
      func()
    }

    if (old?.timeout) clearTimeout(old.timeout)
    if (Date.now() - start >= this.configuration.debounceMaxWait) return run()

    this.debounced.set(id, {
      start,
      timeout: setTimeout(run, <number> this.configuration.debounce),
    })
  }

  /**
   * Get request url for the given event
   */
  getRequestUrl(event: Events) {
    return this.configuration.url
      + (this.configuration.url.substr(-1, 1) !== '/' ? '/' : '')
      + this.configuration.paths[event]
  }

  /**
   * Send a request to the given url containing the given data
   */
  async sendRequest(url: string, data: any) {
    const json = JSON.stringify(data)

    return axios.post(url, json, { headers: { 'X-Hocuspocus-Signature-256': this.createSignature(json) } })
  }

  /**
   * onChange hook
   */
  async onChange(data: onChangePayload) {
    if (!this.configuration.events.includes(Events.Change)) {
      return
    }

    const save = () => {
      this.sendRequest(this.getRequestUrl(Events.Change), {
        document: this.configuration.transformer.fromYdoc(data.document),
        documentName: data.documentName,
        context: data.context,
      })
    }

    if (!this.configuration.debounce) {
      return save()
    }

    this.debounce(data.documentName, save)
  }

  /**
   * onCreateDocument hook
   */
  async onCreateDocument(data: onCreateDocumentPayload) {
    if (!this.configuration.events.includes(Events.Create)) {
      return
    }

    const response = <AxiosResponse> await this.sendRequest(this.getRequestUrl(Events.Create), {
      documentName: data.documentName,
    })

    if (response.status !== 200 || !response.data) return

    const document = typeof response.data === 'string'
      ? JSON.parse(response.data)
      : response.data

    // eslint-disable-next-line guard-for-in,no-restricted-syntax
    for (const fieldName in document) {
      if (data.document.isEmpty(fieldName)) {
        data.document.merge(
          this.configuration.transformer.toYdoc(document[fieldName], fieldName),
        )
      }
    }
  }

  /**
   * onConnect hook
   */
  async onConnect(data: onConnectPayload) {
    if (!this.configuration.events.includes(Events.Connect)) {
      return
    }

    try {
      const response = <AxiosResponse> await this.sendRequest(this.getRequestUrl(Events.Connect), {
        documentName: data.documentName,
        requestHeaders: data.requestHeaders,
        requestParameters: Object.fromEntries(data.requestParameters.entries()),
      })

      return typeof response.data === 'string'
        ? JSON.parse(response.data)
        : response.data
    } catch (e) {
      // eslint-disable-next-line no-throw-literal
      throw null
    }
  }

  async onDisconnect(data: onDisconnectPayload) {
    if (!this.configuration.events.includes(Events.Connect)) {
      return
    }

    await this.sendRequest(this.getRequestUrl(Events.Disconnect), {
      documentName: data.documentName,
      context: data.context,
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function,no-empty-function
  async onUpgrade(data: onUpgradePayload) {
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function,no-empty-function
  async onRequest(data: onRequestPayload) {
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function,no-empty-function
  async onListen(data: onListenPayload) {
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function,no-empty-function
  async onDestroy(data: onDestroyPayload) {
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function,no-empty-function
  async onConfigure(data: onConfigurePayload) {
  }

}
