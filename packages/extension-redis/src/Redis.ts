import { RedisPersistence } from 'y-redis'
import {
  Extension,
  onConnectPayload,
  onCreateDocumentPayload,
  onDisconnectPayload,
} from '@hocuspocus/server'

export interface Configuration {
}

export class Redis implements Extension {

  configuration: Configuration = {}

  cluster = false

  persistence!: RedisPersistence | undefined

  /**
   * Constructor
   */
  constructor(configuration?: Partial<Configuration>) {
    this.configuration = {
      ...this.configuration,
      ...configuration,
    }
  }

  /*
   * onCreateDocument hook
   */
  async onCreateDocument(data: onCreateDocumentPayload) {
    if (!this.persistence) {
      return
    }

    // If another connection has already loaded this doc, return this one instead
    const binding = this.persistence.docs.get(data.documentName)

    if (binding) {
      return binding.doc
    }

    await this.persistence.bindState(data.documentName, data.document).synced
  }

  async onConnect(data: onConnectPayload) {
    // Bind to Redis already? Ok, no worries.
    if (this.persistence) {
      return
    }

    this.persistence = new RedisPersistence(
      // @ts-ignore
      this.cluster
        ? { redisClusterOpts: this.configuration }
        : { redisOpts: this.configuration },
    )

  }

  async onDisconnect(data: onDisconnectPayload) {
    // Not binded to Redis? Never mind!
    if (!this.persistence) {
      return
    }

    // Still clients connected?
    if (data.clientsCount > 0) {
      return
    }

    // Fine, let’s remove the binding …
    this.persistence.destroy()
    this.persistence = undefined

  }

}
