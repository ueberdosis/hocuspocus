import * as Y from 'yjs'
import { RedisPersistence } from 'y-redis'

export interface Configuration {
}

export class Redis {

  configuration: Configuration = {}

  cluster = false

  persistance!: RedisPersistence

  /**
   * Constructor
   * @param configuration
   * @returns {Redis}
   */
  constructor(configuration?: Partial<Configuration>) {
    this.configuration = {
      ...this.configuration,
      ...configuration,
    }

    return this
  }

  /**
   * Connect to the given document
   * @param documentName
   * @param document
   * @returns {Promise<void>}
   */
  async connect(documentName: string, document: Y.Doc) {
    this.persistance = new RedisPersistence(
      // @ts-ignore
      this.cluster
        ? { redisClusterOpts: this.configuration }
        : { redisOpts: this.configuration },
    )

    await this.persistance.bindState(documentName, document).synced
  }

  // eslint-disable-next-line
  async store(documentName: string, update: Uint8Array) {}

}
