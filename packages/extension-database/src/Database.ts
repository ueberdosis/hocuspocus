import {
  Extension, onChangePayload, onLoadDocumentPayload, storePayload,
} from '@hocuspocus/server'
import * as Y from 'yjs'

export interface DatabaseConfiguration {
  /**
   * Pass a Promise to retrieve updates from your database. The Promise should resolve to
   * an array of items with Y.js-compatible binary data.
   */
  fetch: ({ documentName }: { documentName: string}) => Promise<Uint8Array | null>,
  /**
   * Pass a function to store updates in your database.
   */
  store: (data: storePayload) => void,
}

export class Database implements Extension {
  /**
   * Default configuration
   */
  configuration: DatabaseConfiguration = {
    fetch: async () => null,
    store: async () => null,
  }

  /**
   * Constructor
   */
  constructor(configuration: Partial<DatabaseConfiguration>) {
    this.configuration = {
      ...this.configuration,
      ...configuration,
    }
  }

  /**
   * Get stored data from the database.
   */
  async onLoadDocument({ document, documentName }: onLoadDocumentPayload): Promise<any> {
    const update = await this.configuration.fetch({ documentName })

    if (update) {
      Y.applyUpdate(document, update)
    }

    return document
  }

  /**
   * Store new updates in the database.
   */
  async onChange(data: onChangePayload) {
    return this.configuration.store({
      ...data,
      update: Buffer.from(
        Y.encodeStateAsUpdate(data.document),
      ),
    })
  }
}
