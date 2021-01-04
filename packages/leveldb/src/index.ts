import * as Y from 'yjs'
import { LeveldbPersistence } from 'y-leveldb'

export interface Configuration {
  path: string
}

export class LevelDB {

  configuration: Configuration = {
    path: './database',
  }

  provider: LeveldbPersistence

  /**
   * Constructor
   * @param configuration
   * @returns {LevelDB}
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
   * @param documentName
   * @param document
   * @returns {Promise<void>}
   */
  async connect(documentName: string, document: Y.Doc) {
    const storedDocument = await this.provider.getYDoc(documentName)
    const update = Y.encodeStateAsUpdate(document)

    await this.store(documentName, update)

    Y.applyUpdate(document, Y.encodeStateAsUpdate(storedDocument))
  }

  /**
   * Store the given update
   * @param documentName
   * @param update
   * @returns {Promise<void>}
   */
  async store(documentName: string, update: Uint8Array) {
    await this.provider.storeUpdate(documentName, update)
  }
}
