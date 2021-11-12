import assert from 'assert'
import * as Y from 'yjs'
import WebSocket from 'ws'
import { Hocuspocus } from '@hocuspocus/server'
import { HocuspocusProvider } from '@hocuspocus/provider'

let client
const ydoc = new Y.Doc()

context('server/onConnect', () => {
  it('executes the onConnect callback', done => {
    const server = new Hocuspocus()

    server.configure({
      port: 4000,
      async onConnect() {
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

  it('executes the onConnect callback from an extension', done => {
    const server = new Hocuspocus()

    class CustomExtension {
      async onConnect() {
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
    })
  })

  it('has the document name', done => {
    const server = new Hocuspocus()

    server.configure({
      port: 4000,
      async onConnect({ documentName }) {
        assert.strictEqual(documentName, 'hocuspocus-test')

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

  it('sets the client to readOnly', done => {
    const server = new Hocuspocus()

    server.configure({
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

  it('encodes weird document names', done => {
    const weirdDocumentName = '<>{}|^äöüß'

    const server = new Hocuspocus()

    server.configure({
      port: 4000,
      async onConnect({ documentName }) {
        assert.strictEqual(documentName, weirdDocumentName)

        client.destroy()
        server.destroy()

        done()
      },
    }).listen()

    client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: weirdDocumentName,
      document: ydoc,
      WebSocketPolyfill: WebSocket,
    })
  })

  it('stops when the onConnect hook throws an Error', done => {
    const server = new Hocuspocus()

    server.configure({
      port: 4000,
      onConnect() {
        throw new Error()
      },
      // MUST NOT BE CALLED
      onLoadDocument() {
        assert.fail('WARNING: When onConnect fails onLoadDocument must not be called.')
      },
    }).listen()

    client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
      onClose: () => {
        client.destroy()
        server.destroy()

        done()
      },
    })
  })

  it('has the request parameters', done => {
    const server = new Hocuspocus()

    server.configure({
      port: 4000,
      async onConnect({ requestParameters }) {
        assert.strictEqual(requestParameters instanceof URLSearchParams, true)
        assert.strictEqual(requestParameters.has('foo'), true)
        assert.strictEqual(requestParameters.get('foo'), 'bar')

        client.destroy()
        server.destroy()

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
    })
  })

  it('has the request headers', done => {
    const server = new Hocuspocus()

    server.configure({
      port: 4000,
      async onConnect({ requestHeaders }) {
        assert.strictEqual(requestHeaders.connection !== undefined, true)

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

  it('has the whole request', done => {
    const server = new Hocuspocus()

    server.configure({
      port: 4000,
      async onConnect({ request }) {
        assert.strictEqual(request.url, '/hocuspocus-test')

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

  it('has the socketId', done => {
    const server = new Hocuspocus()

    server.configure({
      port: 4000,
      async onConnect({ socketId }) {
        assert.strictEqual(socketId !== undefined, true)

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

  it('has the server instance', done => {
    const server = new Hocuspocus()

    server.configure({
      port: 4000,
      async onConnect({ instance }) {
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

  it('defaults to readOnly = false', done => {
    const server = new Hocuspocus()

    server.configure({
      port: 4000,
      async onConnect({ connection }) {
        assert.strictEqual(connection.readOnly, false)

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

  it('cleans up correctly when client disconnects during onLoadDocument', done => {
    const server = new Hocuspocus()
    let client

    server.configure({
      port: 4000,
      onLoadDocument: async () => {
        client.disconnect()

        // pretent we loaded data from async source
        await new Promise(resolve => setTimeout(resolve, 100))
      },
    }).listen()

    client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'super-unique-name',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
    })

    client.on('disconnect', () => {
      setTimeout(() => {
        assert.strictEqual(server.documents.get('super-unique-name'), undefined, 'no documents')

        client.destroy()
        server.destroy()
        done()
      }, 100)
    })
  })
})
