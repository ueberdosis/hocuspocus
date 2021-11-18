import assert from 'assert'
import * as Y from 'yjs'
import WebSocket from 'ws'
import { Hocuspocus } from '@hocuspocus/server'
import { HocuspocusProvider } from '@hocuspocus/provider'

let client
const ydoc = new Y.Doc()

context('server/onUpgrade', () => {
  it('executes the onUpgrade callback', done => {
    const server = new Hocuspocus()

    server.configure({
      port: 4000,
      async onUpgrade() {
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

  it('executes the onUpgrade callback from an extension', done => {
    const server = new Hocuspocus()

    class CustomExtension {
      async onUpgrade() {
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

  it('has the server instance', done => {
    const server = new Hocuspocus()

    server.configure({
      port: 4000,
      async onUpgrade({ instance }) {
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
