import {
  Extension,
  onChangePayload,
  onConfigurePayload,
  onConnectPayload,
  onCreateDocumentPayload,
  onDestroyPayload,
  onDisconnectPayload,
  onListenPayload,
  onRequestPayload,
  onUpgradePayload,
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
    const persistedDocument = await this.provider.getYDoc(data.documentName)
    const newUpdates = encodeStateAsUpdate(data.document)

    await this.store(data.documentName, newUpdates)
    applyUpdate(data.document, encodeStateAsUpdate(persistedDocument))

    // use the documents update handler directly instead of using the onChange hook
    // to skip the first change that's triggered by the applyUpdate above
    data.document.on('update', (update: Uint8Array) => {
      this.store(data.documentName, update)
    })
  }

  /**
   * store updates in y-leveldb persistence
   */
  async store(documentName: string, update: Uint8Array): Promise<any> {
    return this.provider.storeUpdate(documentName, update)
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function,no-empty-function
  async onChange(data: onChangePayload) {
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function,no-empty-function
  async onConnect(data: onConnectPayload) {
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function,no-empty-function
  async onDisconnect(data: onDisconnectPayload) {
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function,no-empty-function
  async onListen(data: onListenPayload) {
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function,no-empty-function
  async onDestroy(data: onDestroyPayload) {
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function,no-empty-function
  async onConfigure(data: onConfigurePayload) {
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function,no-empty-function
  async onRequest(data: onRequestPayload) {
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function,no-empty-function
  async onUpgrade(data: onUpgradePayload) {
  }
}
