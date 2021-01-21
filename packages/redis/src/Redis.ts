import { RedisPersistence } from 'y-redis'
import {
  Extension, onChangePayload, onConnectPayload, onDisconnectPayload,
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
   * onConnect hook
   */
  async onConnect(data: onConnectPayload, resolve: Function, reject: Function) {
    await this.persistence.bindState(data.documentName, data.document).synced
  }

  /*
   * onChange hook
   */
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  onChange(data: onChangePayload) {}

  /*
   * onDisconnect hook
   */
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  onDisconnect(data: onDisconnectPayload) {}

}
