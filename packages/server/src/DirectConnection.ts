import { URLSearchParams } from 'url'
import Document from './Document'
import type { Hocuspocus } from './Hocuspocus'

export class DirectConnection {
  documentPromise: Promise<Document> | null = null

  instance!: Hocuspocus

  context: any

  document?: Document

  /**
   * Constructor.
   */
  constructor(
    documentPromise: Promise<Document>,
    instance: Hocuspocus,
    context?: any,
  ) {
    this.documentPromise = documentPromise
    this.instance = instance
    this.context = context
  }

  async transact(transaction: (document: Document) => void) {
    if (!this.documentPromise) {
      throw new Error('direct connection closed')
    }

    this.document = await this.documentPromise
    this.document.addDirectConnection()

    transaction(this.document)

    this.instance.storeDocumentHooks(this.document, {
      clientsCount: this.document.getConnectionsCount(),
      context: this.context,
      document: this.document,
      documentName: this.document.name,
      instance: this.instance,
      requestHeaders: {},
      requestParameters: new URLSearchParams(),
      socketId: 'server',
    })
  }

  close() {
    this.document?.removeDirectConnection()
    this.documentPromise = null
  }
}
