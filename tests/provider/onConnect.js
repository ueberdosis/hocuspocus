import assert from 'assert'
import * as Y from 'yjs'
import WebSocket from 'ws'
import { Hocuspocus } from '../../packages/server/src'
import { HocuspocusProvider } from '../../packages/provider/src'

let client
const ydoc = new Y.Doc()

context('provider/onConnect', () => {
  it('executes the onConnect callback', done => {
    const Server = new Hocuspocus()
    Server.configure({ port: 4000 }).listen()

    client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
      onConnect: () => {
        Server.destroy()
        client.destroy()
        done()
      },
    })
  })

  it("executes the on('connect') callback", done => {
    const Server = new Hocuspocus()
    Server.configure({ port: 4000 }).listen()

    client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
    })

    client.on('connect', () => {
      Server.destroy()
      client.destroy()
      done()
    })
  })

  it.skip('doesn’t execute the onConnect callback when the server throws an error', done => {
    const Server = new Hocuspocus()
    Server.configure({
      port: 4000,
      async onConnect() {
        throw new Error()
      },
    }).listen()

    client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
      onConnect: () => {
        assert.fail('onConnect must not be executed')
      },
      onClose: () => {
        Server.destroy()
        client.destroy()
        done()
      },
    })
  })
})
