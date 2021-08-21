import {
  Extension,
  onCreateDocumentPayload,
} from '@hocuspocus/server'

import { applyUpdate, encodeStateAsUpdate } from 'yjs'
import { LeveldbPersistence } from 'y-leveldb'
import rocksDB from 'rocksdb'
import levelup from 'levelup'
import encode from 'encoding-down'

export interface Configuration {
  options: object | undefined,
  path: string,
}

export class RocksDB implements Extension {

  configuration: Configuration = {
    options: {},
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

    this.provider = new LeveldbPersistence(
      this.configuration.path,
      {
        level: (location: string, options: any) => levelup(encode(rocksDB(location), options)),
        levelOptions: this.configuration.options,
      },
    )
  }

  /**
   * onCreateDocument hook
   */
  async onCreateDocument(data: onCreateDocumentPayload): Promise<any> {
    // Get from disk …
    const persistedDocument = await this.provider.getYDoc(data.documentName)
    applyUpdate(data.document, encodeStateAsUpdate(persistedDocument))

    // Apply current state
    const newUpdates = encodeStateAsUpdate(data.document)
    // console.log('[rocksdb]: store document')
    await this.store(data.documentName, newUpdates)

    // Listen for changes …
    // Use the documents update handler directly instead of using the onChange hook
    // to skip the first change that's triggered by the applyUpdate above
    data.document.on('update', (update: Uint8Array) => {
      // console.log('[rocksdb]: store update')
      this.store(data.documentName, update)
    })
  }

  /**
   * store updates in y-leveldb persistence
   */
  async store(documentName: string, update: Uint8Array): Promise<any> {
    return this.provider.storeUpdate(documentName, update)
  }

}
