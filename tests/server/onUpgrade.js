import assert from 'assert'
import * as Y from 'yjs'
import WebSocket from 'ws'
import { Hocuspocus } from '../../packages/server/src'
import { HocuspocusProvider } from '../../packages/provider/src'

let client
const ydoc = new Y.Doc()

context('server/onUpgrade', () => {
  it('executes the onUpgrade callback', done => {
    const Server = new Hocuspocus()

    Server.configure({
      port: 4000,
      async onUpgrade() {
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

  it('executes the onUpgrade callback from an extension', done => {
    const Server = new Hocuspocus()

    class CustomExtension {
      async onUpgrade() {
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

  it('has the server instance', done => {
    const Server = new Hocuspocus()

    Server.configure({
      port: 4000,
      async onUpgrade({ instance }) {
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
    })
  })
})
