import {
  Extension,
  onChangePayload,
  onConfigurePayload,
  onConnectPayload,
  onLoadDocumentPayload,
  onDestroyPayload,
  onDisconnectPayload,
  onListenPayload,
  onRequestPayload,
  onUpgradePayload,
} from '@hocuspocus/server'

export interface LoggerConfiguration {
  /**
   * Prepend all logging message with a string.
   */
  prefix: null | string,
}

export class Logger implements Extension {
  configuration: LoggerConfiguration = {
    prefix: null,
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

  async onLoadDocument(data: onLoadDocumentPayload) {
    this.log(`Loaded document "${data.documentName}"`)
  }

  async onChange(data: onChangePayload) {
    this.log(`Document "${data.documentName}" changed`)
  }

  async onConnect(data: onConnectPayload) {
    this.log(`New connection to "${data.documentName}"`)
  }

  async onDisconnect(data: onDisconnectPayload) {
    this.log(`Connection to "${data.documentName}" closed`)
  }

  async onUpgrade(data: onUpgradePayload) {
    this.log('Upgrading connection')
  }

  async onRequest(data: onRequestPayload) {
    this.log(`Incoming HTTP Request to "${data.request.url}"`)
  }

  async onListen(data: onListenPayload) {
    this.log(`Listening on port "${data.port}"`)
  }

  async onDestroy(data: onDestroyPayload) {
    this.log('Server shutting down')
  }

  async onConfigure(data: onConfigurePayload) {
    this.log('Server configured')
  }

  private log(message: string) {
    message = `[${(new Date()).toISOString()}] ${message} … \n`

    if (this.configuration.prefix) {
      message = `[${this.configuration.prefix}] ${message}`
    }

    process.stdout.write(message)
  }

}
