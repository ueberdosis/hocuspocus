import { RedisPersistence } from 'y-redis'

export class Redis {

  configuration = {}

  /**
   * Constructor
   * @param configuration
   * @param cluster
   * @returns {Redis}
   */
  constructor(configuration = {}, cluster = false) {
    this.configuration = {
      ...this.configuration,
      ...configuration,
    }

    this.persistance = new RedisPersistence(
      cluster ? { redisClusterOpts: this.configuration } : { redisOpts: this.configuration },
    )

    return this
  }

  /**
   * Connect to the given document
   * @param documentName
   * @param document
   * @returns {Promise<void>}
   */
  async connect(documentName, document) {
    await this.persistance.bindState(documentName, document).synced
  }

  // eslint-disable-next-line no-empty-function
  async store(documentName, update) {
  }
}
