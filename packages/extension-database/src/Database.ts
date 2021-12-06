import { Extension, onChangePayload, onLoadDocumentPayload } from '@hocuspocus/server'
import * as Y from 'yjs'

export interface DatabaseConfiguration {
  fetchUpdates: ({ documentName }: { documentName: string}) => Promise<Uint8Array[]>,
  storeUpdate: ({ update, documentName }: { update: Buffer, documentName: string}) => void,
}

export class Database implements Extension {
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

  async onLoadDocument({ document, documentName }: onLoadDocumentPayload): Promise<any> {
    const updates = await this.configuration.fetchUpdates({ documentName })

    if (updates && updates.length) {
      updates.forEach((update: any) => {
        Y.applyUpdate(document, update)
      })
    }

    return document
  }

  async onChange({ document, documentName }: onChangePayload) {
    const update = Buffer.from(
      Y.encodeStateAsUpdate(document),
    )

    return this.configuration.storeUpdate({ update, documentName })
  }
}
