import { Doc, applyUpdate, encodeStateAsUpdate } from 'yjs'
import { LeveldbPersistence } from 'y-leveldb'
import { Persistence } from '@hocuspocus/server'

export interface Configuration {
  path: string,
}

export class LevelDB implements Persistence {

  configuration: Configuration = {
    path: './database',
  }

  provider: LeveldbPersistence

  /**
   * Constructor
   */
  constructor(configuration?: Partial<Configuration>) {
    this.configuration = {
      ...this.configuration,
      ...configuration,
    }

    this.provider = new LeveldbPersistence(this.configuration.path)

    return this
  }

  /**
   * Connect to the given document
   */
  async connect(documentName: string, document: Doc): Promise<any> {
    const storedDocument = await this.provider.getYDoc(documentName)
    const update = encodeStateAsUpdate(document)

    await this.store(documentName, update)

    applyUpdate(document, encodeStateAsUpdate(storedDocument))
  }

  /**
   * Store the given update
   */
  async store(documentName: string, update: Uint8Array): Promise<any> {
    await this.provider.storeUpdate(documentName, update)
  }
}
