import { applyUpdate, encodeStateAsUpdate } from 'yjs'
import { LeveldbPersistence } from 'y-leveldb'
import {
  Extension, onChangePayload, onConnectPayload, onDisconnectPayload,
} from '@hocuspocus/server'

export interface Configuration {
  path: string,
}

export class LevelDB implements Extension {

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

  /*
   * onConnect hook
   */
  async onConnect(data: onConnectPayload, resolve: Function, reject: Function) {
    const storedDocument = await this.provider.getYDoc(data.documentName)
    const update = encodeStateAsUpdate(data.document)

    await this.store(data.documentName, update)

    applyUpdate(data.document, encodeStateAsUpdate(storedDocument))
  }

  /*
   * onChange hook
   */
  onChange(data: onChangePayload) {
    this.store(data.documentName, data.update)
  }

  /*
   * onDisconnect hook
   */
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  onDisconnect(data: onDisconnectPayload) {}

  /**
   * Store the given update in the database
   * @private
   */
  private store(documentName: string, update: Uint8Array) {
    this.provider.storeUpdate(documentName, update)
  }
}
