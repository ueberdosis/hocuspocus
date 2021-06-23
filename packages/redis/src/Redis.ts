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
    // If another connection has already loaded this doc, return this one instead
    const binding = this.persistence.docs.get(data.documentName)

    if (binding) {
      return binding.doc
    }

    await this.persistence.bindState(data.documentName, data.document).synced
  }

  async onConnect(data: onConnectPayload) {
  }

  async onChange(data: onChangePayload) {
  }

  async onDisconnect(data: onDisconnectPayload) {
  }

  async onListen(data: onListenPayload) {
  }

  async onDestroy(data: onDestroyPayload) {
  }

  async onConfigure(data: onConfigurePayload) {
  }

  async onRequest(data: onRequestPayload) {
  }

  async onUpgrade(data: onUpgradePayload) {
  }

}
