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

export class Logger implements Extension {

  async onCreateDocument(data: onCreateDocumentPayload) {
    Logger.log(`Created document "${data.documentName}"`)
  }

  async onChange(data: onChangePayload) {
    Logger.log(`Document "${data.documentName}" changed`)
  }

  async onConnect(data: onConnectPayload) {
    Logger.log(`New connection to "${data.documentName}"`)
  }

  async onDisconnect(data: onDisconnectPayload) {
    Logger.log(`Connection to "${data.documentName}" closed`)
  }

  async onUpgrade(data: onUpgradePayload) {
    Logger.log('Upgrading connection')
  }

  async onRequest(data: onRequestPayload) {
    Logger.log(`Incoming HTTP Request to "${data.request.url}"`)
  }

  async onListen(data: onListenPayload) {
    Logger.log(`Listening on port "${data.port}"`)
  }

  async onDestroy(data: onDestroyPayload) {
    Logger.log('Server shutting down')
  }

  async onConfigure(data: onConfigurePayload) {
    Logger.log('Server configured')
  }

  private static log(message: string) {
    process.stdout.write(`[${(new Date()).toISOString()}] ${message} … \n`)
  }

}
