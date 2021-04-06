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
        level: (location: string, options: any) => levelup(rocksDB(location), options),
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

    applyUpdate(data.document, encodeStateAsUpdate(persistedDocument))

    await this.store(data.documentName, newUpdates)
  }

  /**
   * onChange hook
   */
  async onChange(data: onChangePayload): Promise<any> {
    await this.store(data.documentName, data.update)
  }

  /**
   * store updates in y-leveldb persistence
   */
  async store(documentName: string, update: Uint8Array): Promise<any> {
    return this.provider.storeUpdate(documentName, update)
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
