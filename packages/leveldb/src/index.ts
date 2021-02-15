import { applyUpdate, encodeStateAsUpdate } from 'yjs'
import { LeveldbPersistence } from 'y-leveldb'
import {
  Extension, onChangePayload, onConnectPayload, onCreateDocumentPayload, onDisconnectPayload,
} from '@hocuspocus/server'
import rocksDB from 'rocksdb'
import levelup from 'levelup'

export interface Configuration {
  options: object | undefined,
  path: string,
  useRocksDB: boolean | undefined,
}

export class LevelDB implements Extension {

  configuration: Configuration = {
    options: {},
    path: './database',
    useRocksDB: true,
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
        level: this.configuration.useRocksDB
          ? (location: string, options: any) => levelup(rocksDB(location), options)
          : undefined,
        levelOptions: this.configuration.options,
      },
    )

    return this
  }

  /*
   * onConnect hook
   */
  async onCreateDocument(data: onCreateDocumentPayload): Promise<any> {
    const storedDocument = await this.provider.getYDoc(data.documentName)
    const update = encodeStateAsUpdate(data.document)

    await this.store(data.documentName, update)

    applyUpdate(data.document, encodeStateAsUpdate(storedDocument))
  }

  /*
   * onChange hook
   */
  onChange(data: onChangePayload): void {
    this.store(data.documentName, data.update)
  }

  /*
   * onConnect hook
   */
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  onConnect(data: onConnectPayload): void {}

  /*
   * onDisconnect hook
   */
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  onDisconnect(data: onDisconnectPayload): void {}

  /**
   * Store the given update in the database
   * @private
   */
  private store(documentName: string, update: Uint8Array): void {
    this.provider.storeUpdate(documentName, update)
  }
}
