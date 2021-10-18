import assert from 'assert'
import * as Y from 'yjs'
import WebSocket from 'ws'
import { HocuspocusProvider } from '@hocuspocus/provider'
import { Hocuspocus } from '@hocuspocus/server'

let client
const ydoc = new Y.Doc()

context('server/onDisconnect', () => {
  it('executes the onDisconnect callback', done => {
    const server = new Hocuspocus()

    server.configure({
      port: 4000,
      async onDisconnect() {
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
      onConnect: () => {
        client.disconnect()
      },
    })
  })

  it('executes the onDisconnect callback from an extension', done => {
    const server = new Hocuspocus()

    class CustomExtension {
      async onDisconnect() {
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
      onConnect: () => {
        client.disconnect()
      },
    })
  })

  it('passes the context to the onCreateDocument callback', done => {
    const server = new Hocuspocus()

    const mockContext = {
      user: 123,
    }

    server.configure({
      port: 4000,
      onConnect() {
        return mockContext
      },
      onDisconnect({ context }) {
        assert.deepStrictEqual(context, mockContext)

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
      onConnect: () => {
        client.disconnect()
      },
    })
  })

  it('has the server instance', done => {
    const server = new Hocuspocus()

    server.configure({
      port: 4000,
      async onDisconnect({ instance }) {
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
      onConnect: () => {
        client.disconnect()
      },
    })
  })
})
