import assert from 'assert'
import * as Y from 'yjs'
import WebSocket from 'ws'
import { Hocuspocus } from '../../packages/server/src'
import { HocuspocusProvider } from '../../packages/provider/src'

let client
const ydoc = new Y.Doc()

context('server/onConfigure', () => {
  it('onConfigure callback is executed', done => {
    const server = new Hocuspocus()

    server.configure({
      port: 4000,
      async onConfigure({ instance }) {
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
      maxAttempts: 1,
    })
  })

  it('executes onConfigure callback from an extension', done => {
    const server = new Hocuspocus()

    class CustomExtension {
      async onConfigure() {
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

  it('has the configuration', done => {
    const server = new Hocuspocus()
    server.configure({
      port: 1337,
      async onConfigure({ configuration }) {
        assert.strictEqual(configuration.port, 1337)

        server.destroy()
        done()
      },
    })
  })
})
