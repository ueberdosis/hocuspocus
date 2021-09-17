import assert from 'assert'
import * as Y from 'yjs'
import WebSocket from 'ws'
import { Hocuspocus } from '../../packages/server/src'
import { HocuspocusProvider } from '../../packages/provider/src'

let client
const ydoc = new Y.Doc()

context('server/onCreateDocument', () => {
  it('executes the onCreateDocument callback', done => {
    const server = new Hocuspocus()

    server.configure({
      port: 4000,
      onCreateDocument() {
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
      maxAttempts: 1,
    })
  })

  it('executes the onCreateDocument callback from an extension', done => {
    const server = new Hocuspocus()

    class CustomExtension {
      onCreateDocument() {
        client.destroy()
        server.destroy()
        done()
      }
    }

    server.configure({
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
      maxAttempts: 1,
    })
  })

  it('passes the context and connection to the onCreateDocument callback', done => {
    const server = new Hocuspocus()

    const mockContext = {
      user: 123,
    }

    server.configure({
      port: 4000,
      onConnect({ connection }) {
        connection.readOnly = true
        return mockContext
      },
      onCreateDocument({ context, connection }) {
        assert.deepStrictEqual(context, mockContext)
        assert.deepStrictEqual(connection, {
          isAuthenticated: false,
          readOnly: true,
        })

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
      maxAttempts: 1,
    })
  })

  it('sets the client to readOnly', done => {
    const server = new Hocuspocus()

    server.configure({
      port: 4000,
      async onCreateDocument({ connection }) {
        connection.readOnly = true
      },
    }).listen()

    client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
      maxAttempts: 1,
      onSynced() {
        server.documents.get('hocuspocus-test').connections.forEach(conn => {
          assert.strictEqual(conn.connection.readOnly, true)
        })
        client.destroy()
        server.destroy()
        done()
      },
    })
  })

  it('creates a new document in the onCreateDocument callback', done => {
    const server = new Hocuspocus()

    server.configure({
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
      maxAttempts: 1,
    })

    client.on('synced', () => {
      const value = ydoc.getArray('foo').get(0)
      assert.strictEqual(value, 'bar')

      client.destroy()
      server.destroy()
      done()
    })
  })

  it('multiple simultanous connections do not create multiple documents', done => {
    const server = new Hocuspocus()

    server.configure({
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
      maxAttempts: 1,
    })

    const anotherClient = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: new Y.Doc(),
      WebSocketPolyfill: WebSocket,
      maxAttempts: 1,
    })

    client.on('synced', () => {
      assert.strictEqual(server.documents.size, 1)

      client.destroy()
      anotherClient.destroy()
      server.destroy()
      done()
    })
  })

  it('has the server instance', done => {
    const server = new Hocuspocus()

    server.configure({
      port: 4000,
      async onCreateDocument({ instance }) {
        assert.strictEqual(instance, server)

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
})
