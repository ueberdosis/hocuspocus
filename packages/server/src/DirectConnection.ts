import { URLSearchParams } from 'url'
import Document from './Document.js'
import type { Hocuspocus } from './Hocuspocus.js'
import type { DirectConnection as DirectConnectionInterface } from './types.js'

export class DirectConnection implements DirectConnectionInterface {
  document: Document | null = null

  instance!: Hocuspocus

  context: any

  /**
   * Constructor.
   */
  constructor(
    document: Document,
    instance: Hocuspocus,
    context?: any,
  ) {
    this.document = document
    this.instance = instance
    this.context = context

    this.document.addDirectConnection()
  }

  async transact(transaction: (document: Document) => void, transactionOrigin?: any) {
    if (!this.document) {
      throw new Error('direct connection closed')
    }

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
      transactionOrigin,
    })
  }

  disconnect() {
    this.document?.removeDirectConnection()
    this.document = null
  }
}
