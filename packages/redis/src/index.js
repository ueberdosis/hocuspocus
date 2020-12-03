import { RedisPersistence } from 'y-redis'

export class Redis {

  configuration = {
    redisOpts: {},
    redisClusterOpts: {},
  }

  /**
   * Constructor
   * @param configuration
   * @param clusterConfiguration
   * @returns {Redis}
   */
  constructor(configuration = {}, clusterConfiguration = {}) {
    this.configuration = {
      redisOpts: {
        ...this.configuration.redisOpts,
        ...configuration,
      },
      redisClusterOpts: {
        ...this.configuration.redisClusterOpts,
        ...clusterConfiguration,
      },
    }

    if (Object.keys(this.configuration.redisClusterOpts).length === 0) {
      this.configuration.redisClusterOpts = null
    }

    this.persistance = new RedisPersistence(this.configuration)

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
