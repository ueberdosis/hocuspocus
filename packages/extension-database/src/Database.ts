import { Extension, onChangePayload, onLoadDocumentPayload } from '@hocuspocus/server'
import * as Y from 'yjs'

export interface DatabaseConfiguration {
  /**
   * Pass a Promise to retrieve updates from your database. The Promise should resolve to
   * an array of items with Y.js-compatible binary data.
   */
  fetchUpdates: ({ documentName }: { documentName: string}) => Promise<Uint8Array[]>,
  /**
   * Pass a function to store updates in your database.
   */
  storeUpdate: ({ update, documentName }: { update: Buffer, documentName: string}) => void,
}

export class Database implements Extension {
  /**
   * Default configuration
   */
  configuration: DatabaseConfiguration = {
    fetchUpdates: async () => [],
    storeUpdate: async () => null,
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
    const updates = await this.configuration.fetchUpdates({ documentName })

    if (updates && updates.length) {
      updates.forEach((update: any) => {
        Y.applyUpdate(document, update)
      })
    }

    return document
  }

  /**
   * Store new updates in the database.
   */
  async onChange({ document, documentName }: onChangePayload) {
    const update = Buffer.from(
      Y.encodeStateAsUpdate(document),
    )

    return this.configuration.storeUpdate({ update, documentName })
  }
}
