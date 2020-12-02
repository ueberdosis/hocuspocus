import Y from 'yjs'
import YLevelDB from 'y-leveldb'

const LevelDBPersistence = YLevelDB.LeveldbPersistence

export class LevelDB {
  configuration = {
    path: './database',
  }

  provider

  constructor(configuration) {
    this.configuration = {
      ...this.configuration,
      ...configuration,
    }

    this.init()

    return this
  }

  init() {
    this.provider = new LevelDBPersistence(this.configuration.path)
  }

  async connect(documentName, document) {
    const storedDocument = await this.provider.getYDoc(documentName)
    const update = Y.encodeStateAsUpdate(document)

    this.provider.storeUpdate(documentName, update)

    Y.applyUpdate(document, Y.encodeStateAsUpdate(storedDocument))

    document.on('update', update => {
      this.provider.storeUpdate(documentName, update)
    })
  }

  // eslint-disable-next-line
  async store(documentName, document) {}
}
