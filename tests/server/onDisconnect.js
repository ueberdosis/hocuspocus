import assert from 'assert'
import * as Y from 'yjs'
import WebSocket from 'ws'
import { Hocuspocus } from '../../packages/server/src'
import { HocuspocusProvider } from '../../packages/provider/src'

let client
const ydoc = new Y.Doc()

context('server/onDisconnect', () => {
  it('executes the onDisconnect callback', done => {
    const Server = new Hocuspocus()

    Server.configure({
      port: 4000,
      async onDisconnect() {
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
      onConnect: () => {
        client.disconnect()
      },
    })
  })

  it('executes the onDisconnect callback from an extension', done => {
    const Server = new Hocuspocus()

    class CustomExtension {
      async onDisconnect() {
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
      onConnect: () => {
        client.disconnect()
      },
    })
  })

  it('passes the context to the onCreateDocument callback', done => {
    const Server = new Hocuspocus()

    const mockContext = {
      user: 123,
    }

    Server.configure({
      port: 4000,
      onConnect() {
        return mockContext
      },
      onDisconnect({ context }) {
        assert.deepStrictEqual(context, mockContext)

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
      onConnect: () => {
        client.disconnect()
      },
    })
  })

  it('has the server instance', done => {
    const Server = new Hocuspocus()

    Server.configure({
      port: 4000,
      async onDisconnect({ instance }) {
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
      onConnect: () => {
        client.disconnect()
      },
    })
  })
})
