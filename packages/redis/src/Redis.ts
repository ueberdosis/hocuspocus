import { Doc } from 'yjs'
import { RedisPersistence } from 'y-redis'
import { Persistence } from '@hocuspocus/server'

export interface Configuration {
}

export class Redis implements Persistence {

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

    return this
  }

  /**
   * Connect to the given document
   */
  async connect(documentName: string, document: Doc): Promise<any> {
    this.persistence = new RedisPersistence(
      // @ts-ignore
      this.cluster
        ? { redisClusterOpts: this.configuration }
        : { redisOpts: this.configuration },
    )

    await this.persistence.bindState(documentName, document).synced
  }

  // eslint-disable-next-line
  async store(documentName: string, update: Uint8Array): Promise<any> {}
}
