import assert from 'assert'
import * as Y from 'yjs'
import WebSocket from 'ws'
import { Hocuspocus } from '@hocuspocus/server'
import { HocuspocusProvider } from '@hocuspocus/provider'

let client
const ydoc = new Y.Doc()

context('server/getDocumentName', () => {
  it('prefixes the document name', done => {
    const server = new Hocuspocus()

    server.configure({
      port: 4000,
      getDocumentName({ request }) {
        const documentNameFromRequest = decodeURI(
          request.url?.slice(1)?.split('?')[0] || '',
        )

        return `prefix-${documentNameFromRequest}`
      },
      async onConnect({ documentName }) {
        assert.strictEqual(documentName, 'prefix-hocuspocus-test')

        client.destroy()
        server.destroy()

        done()
      },
    }).listen()

    client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
    })
  })

  it('prefixes the document name based on the request', done => {
    const server = new Hocuspocus()

    server.configure({
      port: 4000,
      getDocumentName({ request, requestParameters }) {
        const documentNameFromRequest = decodeURI(
          request.url?.slice(1)?.split('?')[0] || '',
        )

        return `${requestParameters.get('prefix')}-${documentNameFromRequest}`
      },
      async onConnect({ documentName }) {
        assert.strictEqual(documentName, 'prefix-hocuspocus-test')

        client.destroy()
        server.destroy()

        done()
      },
    }).listen()

    client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      parameters: {
        prefix: 'prefix',
      },
      name: 'hocuspocus-test',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
    })
  })

  it('prefixes the document name with an async function', done => {
    const server = new Hocuspocus()

    server.configure({
      port: 4000,
      async getDocumentName({ request, requestParameters }) {
        const prefix = await new Promise(resolve => setTimeout(() => {
          return resolve('prefix')
        }, 50))

        const documentNameFromRequest = decodeURI(
          request.url?.slice(1)?.split('?')[0] || '',
        )

        return `${prefix}-${documentNameFromRequest}`
      },
      async onConnect({ documentName }) {
        assert.strictEqual(documentName, 'prefix-hocuspocus-test')

        client.destroy()
        server.destroy()

        done()
      },
    }).listen()

    client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      parameters: {
        prefix: 'prefix',
      },
      name: 'hocuspocus-test',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
    })
  })
})
