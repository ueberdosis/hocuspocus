import Y from 'yjs'
import YLevelDB from 'y-leveldb'

const LevelDBPersistence = YLevelDB.LeveldbPersistence

export class LevelDB {

  configuration = {
    path: './database',
  }

  provider

  /**
   * Constructor
   * @param configuration
   * @returns {LevelDB}
   */
  constructor(configuration) {
    this.configuration = {
      ...this.configuration,
      ...configuration,
    }

    this.provider = new LevelDBPersistence(this.configuration.path)

    return this
  }

  /**
   * Connect to the given document
   * @param documentName
   * @param document
   * @returns {Promise<void>}
   */
  async connect(documentName, document) {
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
  async store(documentName, update) {
    await this.provider.storeUpdate(documentName, update)
  }
}
