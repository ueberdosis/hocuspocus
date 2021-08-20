import assert from 'assert'
import * as Y from 'yjs'
import WebSocket from 'ws'
import { Hocuspocus } from '../../packages/server/src'
import { HocuspocusProvider } from '../../packages/provider/src'

let client
const ydoc = new Y.Doc()
const Server = new Hocuspocus()

context('server/onCreateDocument', () => {
  before(() => {
    Server.configure({
      port: 4000,
      onCreateDocument({ document }) {
        // delay more accurately simulate a database fetch
        return new Promise(resolve => {
          setTimeout(() => {
            document.getArray('foo').insert(0, ['bar'])
            resolve(document)
          }, 250)
        })
      },
    }).listen()
  })

  after(() => {
    Server.destroy()
  })

  afterEach(() => {
    client.destroy()
  })

  it('onCreateDocument callback creates a new document', done => {
    client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
    })

    client.on('synced', () => {
      const value = ydoc.getArray('foo').get(0)
      assert.strictEqual(value, 'bar')
      done()
    })
  })

  it('multiple simultanous connections do not create multiple documents', done => {
    client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
    })

    const client2 = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: new Y.Doc(),
      WebSocketPolyfill: WebSocket,
    })

    client.on('synced', () => {
      assert.strictEqual(Server.documents.size, 1)

      client2.destroy()
      done()
    })
  })
})
