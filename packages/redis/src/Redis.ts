import { RedisPersistence } from 'y-redis'
import {
  Extension,
  onChangePayload, onConfigurePayload,
  onConnectPayload, onCreateDocumentPayload,
  onDestroyPayload,
  onDisconnectPayload,
  onListenPayload, onRequestPayload, onUpgradePayload,
} from '@hocuspocus/server'

export interface Configuration {
}

export class Redis implements Extension {

  configuration: Configuration = {}

  cluster = false

  persistence!: RedisPersistence

  /**
   * Constructor
   */
  constructor(configuration?: Partial<Configuration>) {
    this.configuration = {
      ...this.configuration,
      ...configuration,
    }

    this.persistence = new RedisPersistence(
      // @ts-ignore
      this.cluster
        ? { redisClusterOpts: this.configuration }
        : { redisOpts: this.configuration },
    )

    return this
  }

  /*
   * onCreateDocument hook
   */
  async onCreateDocument(data: onCreateDocumentPayload) {
    // If another connection has already loaded this doc, this is a no-op
    if (this.persistence.docs.has(data.documentName)) {
      return
    }

    await this.persistence.bindState(data.documentName, data.document).synced
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function,no-empty-function
  async onConnect(data: onConnectPayload) {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function,no-empty-function
  async onChange(data: onChangePayload) {
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function,no-empty-function
  async onDisconnect(data: onDisconnectPayload) {
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

  // eslint-disable-next-line @typescript-eslint/no-empty-function,no-empty-function
  async onRequest(data: onRequestPayload) {
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function,no-empty-function
  async onUpgrade(data: onUpgradePayload) {
  }

}
