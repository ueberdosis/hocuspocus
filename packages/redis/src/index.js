import { RedisPersistence } from 'y-redis'

export class Redis {

  configuration = {}

  cluster = false

  persistance

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

  isCluster() {
    this.cluster = true

    return this
  }

  /**
   * Connect to the given document
   * @param documentName
   * @param document
   * @returns {Promise<void>}
   */
  async connect(documentName, document) {
    this.persistance = new RedisPersistence(
      this.cluster
        ? { redisClusterOpts: this.configuration }
        : { redisOpts: this.configuration },
    )

    await this.persistance.bindState(documentName, document).synced
  }

  // eslint-disable-next-line no-empty-function
  async store(documentName, update) {
  }
}
