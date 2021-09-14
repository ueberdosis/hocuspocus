import assert from 'assert'
import * as Y from 'yjs'
import WebSocket from 'ws'
import { Hocuspocus } from '../../packages/server/src'
import { HocuspocusProvider } from '../../packages/provider/src'

let client
const ydoc = new Y.Doc()

context('server/onConnect', () => {
  it('executes the onConnect callback', done => {
    const Server = new Hocuspocus()

    Server.configure({
      port: 4000,
      async onConnect() {
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
      maxAttempts: 1,
    })
  })

  it('executes the onConnect callback from an extension', done => {
    const Server = new Hocuspocus()

    class CustomExtension {
      async onConnect() {
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
      maxAttempts: 1,
    })
  })

  it('has the document name', done => {
    const Server = new Hocuspocus()

    Server.configure({
      port: 4000,
      async onConnect({ documentName }) {
        assert.strictEqual(documentName, 'hocuspocus-test')

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
      maxAttempts: 1,
    })
  })

  it('sets the client to readOnly', done => {
    const Server = new Hocuspocus()

    Server.configure({
      port: 4000,
      async onConnect({ connection }) {
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
        Server.documents.get('hocuspocus-test').connections.forEach(conn => {
          assert.strictEqual(conn.connection.readOnly, true)
        })
        client.destroy()
        Server.destroy()
        done()
      },
    })
  })

  it('encodes weird document names', done => {
    const weirdDocumentName = '<>{}|^äöüß'

    const Server = new Hocuspocus()

    Server.configure({
      port: 4000,
      async onConnect({ documentName }) {
        assert.strictEqual(documentName, weirdDocumentName)

        client.destroy()
        Server.destroy()

        done()
      },
    }).listen()

    client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: weirdDocumentName,
      document: ydoc,
      WebSocketPolyfill: WebSocket,
      maxAttempts: 1,
    })
  })

  it('stops when the onConnect hook throws an Error', done => {
    const Server = new Hocuspocus()

    Server.configure({
      port: 4000,
      onConnect() {
        throw new Error()
      },
      // MUST NOT BE CALLED
      onCreateDocument() {
        assert.fail('WARNING: When onConnect fails onCreateDocument must not be called.')
      },
    }).listen()

    client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
      maxAttempts: 1,
      onClose: () => {
        client.destroy()
        Server.destroy()

        done()
      },
    })
  })

  it('has the request parameters', done => {
    const Server = new Hocuspocus()

    Server.configure({
      port: 4000,
      async onConnect({ requestParameters }) {
        assert.strictEqual(requestParameters instanceof URLSearchParams, true)
        assert.strictEqual(requestParameters.has('foo'), true)
        assert.strictEqual(requestParameters.get('foo'), 'bar')

        client.destroy()
        Server.destroy()

        done()
      },
    }).listen()

    client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      parameters: {
        foo: 'bar',
      },
      document: ydoc,
      WebSocketPolyfill: WebSocket,
      maxAttempts: 1,
    })
  })

  it('has the request headers', done => {
    const Server = new Hocuspocus()

    Server.configure({
      port: 4000,
      async onConnect({ requestHeaders }) {
        assert.strictEqual(requestHeaders.connection !== undefined, true)

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
      maxAttempts: 1,
    })
  })

  it('has the whole request', done => {
    const Server = new Hocuspocus()

    Server.configure({
      port: 4000,
      async onConnect({ request }) {
        assert.strictEqual(request.url, '/hocuspocus-test')

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
      maxAttempts: 1,
    })
  })

  it('has the socketId', done => {
    const Server = new Hocuspocus()

    Server.configure({
      port: 4000,
      async onConnect({ socketId }) {
        assert.strictEqual(socketId !== undefined, true)

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
      maxAttempts: 1,
    })
  })

  it('has the server instance', done => {
    const Server = new Hocuspocus()

    Server.configure({
      port: 4000,
      async onConnect({ instance }) {
        assert.strictEqual(instance, Server)

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
      maxAttempts: 1,
    })
  })

  it('defaults to readOnly = false', done => {
    const Server = new Hocuspocus()

    Server.configure({
      port: 4000,
      async onConnect({ connection }) {
        assert.strictEqual(connection.readOnly, false)

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
      maxAttempts: 1,
    })
  })
})
