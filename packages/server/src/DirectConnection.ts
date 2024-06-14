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

    await this.instance.storeDocumentHooks(this.document, {
      clientsCount: this.document.getConnectionsCount(),
      context: this.context,
      document: this.document,
      documentName: this.document.name,
      instance: this.instance,
      requestHeaders: {},
      requestParameters: new URLSearchParams(),
      socketId: 'server',
      transactionOrigin,
    }, true)
  }

  async disconnect() {
    if (this.document) {

      this.document?.removeDirectConnection()

      await this.instance.storeDocumentHooks(this.document, {
        clientsCount: this.document.getConnectionsCount(),
        context: this.context,
        document: this.document,
        documentName: this.document.name,
        instance: this.instance,
        requestHeaders: {},
        requestParameters: new URLSearchParams(),
        socketId: 'server',
      }, true)

      this.document = null
    }
  }

}
