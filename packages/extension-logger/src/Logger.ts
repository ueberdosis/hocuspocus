import {
  Extension,
  onChangePayload,
  onConfigurePayload,
  onConnectPayload,
  onLoadDocumentPayload,
  onDestroyPayload,
  onDisconnectPayload,
  onRequestPayload,
  onUpgradePayload,
} from '@hocuspocus/server'

export interface LoggerConfiguration {
  /**
   * Prepend all logging message with a string.
   *
   * @deprecated
   */
  prefix: null | string,
  /**
   * Whether to log something for the `onLoadDocument` hook.
   */
  onLoadDocument: boolean,
  /**
   * Whether to log something for the `onChange` hook.
   */
  onChange: boolean,
  /**
   * Whether to log something for the `onStoreDocument` hook.
   */
   onStoreDocument: boolean,
  /**
   * Whether to log something for the `onConnect` hook.
   */
  onConnect: boolean,
  /**
   * Whether to log something for the `onDisconnect` hook.
   */
  onDisconnect: boolean,
  /**
   * Whether to log something for the `onUpgrade` hook.
   */
  onUpgrade: boolean,
  /**
   * Whether to log something for the `onRequest` hook.
   */
  onRequest: boolean,
  /**
   * Whether to log something for the `onDestroy` hook.
   */
  onDestroy: boolean,
  /**
   * Whether to log something for the `onConfigure` hook.
   */
  onConfigure: boolean,
  /**
   * A log function, if none is provided output will go to console
   */
  log: (...args: any[]) => void,
}

export class Logger implements Extension {
  name: string | null = null

  configuration: LoggerConfiguration = {
    prefix: null,
    onLoadDocument: true,
    onChange: true,
    onStoreDocument: true,
    onConnect: true,
    onDisconnect: true,
    onUpgrade: true,
    onRequest: true,
    onDestroy: true,
    onConfigure: true,
    log: console.log, // eslint-disable-line
  }

  /**
   * Constructor
   */
  constructor(configuration?: Partial<LoggerConfiguration>) {
    this.configuration = {
      ...this.configuration,
      ...configuration,
    }
  }

  async onConfigure(data: onConfigurePayload) {
    this.name = data.instance.configuration.name

    if (!this.configuration.onConfigure) {
      return
    }

    if (this.configuration.prefix) {
      console.warn('[hocuspocus warn] The Logger \'prefix\' is deprecated. Pass a \'name\' to the Hocuspocus configuration instead.')
    }
  }

  async onLoadDocument(data: onLoadDocumentPayload) {
    if (this.configuration.onLoadDocument) {
      this.log(`Loaded document "${data.documentName}".`)
    }
  }

  async onChange(data: onChangePayload) {
    if (this.configuration.onChange) {
      this.log(`Document "${data.documentName}" changed.`)
    }
  }

  async onStoreDocument(data: onDisconnectPayload) {
    if (this.configuration.onStoreDocument) {
      this.log(`Store "${data.documentName}".`)
    }
  }

  async onConnect(data: onConnectPayload) {
    if (this.configuration.onConnect) {
      this.log(`New connection to "${data.documentName}".`)
    }
  }

  async onDisconnect(data: onDisconnectPayload) {
    if (this.configuration.onDisconnect) {
      this.log(`Connection to "${data.documentName}" closed.`)
    }
  }

  async onUpgrade(data: onUpgradePayload) {
    if (this.configuration.onUpgrade) {
      this.log('Upgrading connection …')
    }
  }

  async onRequest(data: onRequestPayload) {
    if (this.configuration.onRequest) {
      this.log(`Incoming HTTP Request to ${data.request.url}`)
    }
  }

  async onDestroy(data: onDestroyPayload) {
    if (this.configuration.onDestroy) {
      this.log('Shut down.')
    }
  }

  private log(message: string) {
    const date = (new Date()).toISOString()
    let meta = `${date}`

    if (this.name) {
      meta = `${this.name} ${meta}`
    }

    message = `[${meta}] ${message}`

    this.configuration.log(message)
  }
}
