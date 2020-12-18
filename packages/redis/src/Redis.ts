import { RedisPersistence } from 'y-redis'

export class Redis {

  configuration: any = {}

  cluster = false

  persistance: any

  /**
   * Constructor
   * @param configuration
   * @returns {Redis}
   */
  constructor(configuration = {}) {
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
  async connect(documentName: any, document: any) {
    this.persistance = new RedisPersistence(
      this.cluster
        ? { redisClusterOpts: this.configuration }
        : { redisOpts: this.configuration },
    )

    await this.persistance.bindState(documentName, document).synced
  }

  // eslint-disable-next-line
  async store(documentName: any, update: any) {}

}
