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
import debounce from 'lodash.debounce'

export interface Configuration {
  options: object | undefined,
  path: string,
  useLevelDb: boolean | undefined,
}

export class RocksDB implements Extension {

  configuration: Configuration = {
    options: {},
    path: './database',
    useLevelDb: false,
  }

  provider: LeveldbPersistence

  debounced: any

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
        level: this.configuration.useLevelDb
          ? undefined
          : (location: string, options: any) => levelup(rocksDB(location), options),
        levelOptions: this.configuration.options,
      },
    )

    return this
  }

  async onCreateDocument(data: onCreateDocumentPayload): Promise<any> {
    const storedDocument = await this.provider.getYDoc(data.documentName)
    const update = encodeStateAsUpdate(data.document)

    await this.store(data.documentName, update)

    applyUpdate(data.document, encodeStateAsUpdate(storedDocument))
  }

  async onChange(data: onChangePayload): Promise<any> {
    this.store(data.documentName, data.update)
  }

  /**
   * Store the given update in the database
   * @private
   */
  private store(documentName: string, update: Uint8Array): void {
    this.provider.storeUpdate(documentName, update)
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
