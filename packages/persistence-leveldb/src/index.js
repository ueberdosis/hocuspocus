import Y from "yjs";
import LevelDB from 'y-leveldb'

export class PersistenceLevelDB {
  configuration = {
    path: './database',
  }

  provider

  constructor(configuration) {
    this.configuration = {
      ...this.configuration,
      ...configuration
    }

    console.log('LevelDB persistence configuration: ', this.configuration)

    this.init()

    return this
  }

  init() {
    this.provider = new LevelDB.LeveldbPersistence(this.configuration.path)
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

  async store(documentName, document) {}
}
