import assert from 'assert'
import * as Y from 'yjs'
import WebSocket from 'ws'
import { Hocuspocus } from '../../packages/server/src'
import { HocuspocusProvider } from '../../packages/provider/src'

let client
const ydoc = new Y.Doc()

context('server/onCreateDocument', () => {
  it('executes the onCreateDocument callback', done => {
    const Server = new Hocuspocus()

    Server.configure({
      port: 4000,
      onCreateDocument() {
        client.destroy()
        Server.destroy()
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

  it('executes the onCreateDocument callback from an extension', done => {
    const Server = new Hocuspocus()

    class CustomExtension {
      onCreateDocument() {
        client.destroy()
        Server.destroy()
        done()
      }
    }

    Server.configure({
      port: 4000,
      extensions: [
        new CustomExtension(),
      ],
    }).listen()

    client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
    })
  })

  it('creates a new document in the onCreateDocument callback', done => {
    const Server = new Hocuspocus()

    Server.configure({
      port: 4000,
      onCreateDocument({ document }) {
        // delay more accurately simulates a database fetch
        return new Promise(resolve => {
          setTimeout(() => {
            document.getArray('foo').insert(0, ['bar'])
            resolve(document)
          }, 200)
        })
      },
    }).listen()

    client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
    })

    client.on('synced', () => {
      const value = ydoc.getArray('foo').get(0)
      assert.strictEqual(value, 'bar')

      client.destroy()
      Server.destroy()
      done()
    })
  })

  it('multiple simultanous connections do not create multiple documents', done => {
    const Server = new Hocuspocus()

    Server.configure({
      port: 4000,
      onCreateDocument({ document }) {
        // delay more accurately simulates a database fetch
        return new Promise(resolve => {
          setTimeout(() => {
            document.getArray('foo').insert(0, ['bar'])
            resolve(document)
          }, 200)
        })
      },
    }).listen()

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

      client.destroy()
      client2.destroy()
      Server.destroy()
      done()
    })
  })
})
