import assert from 'assert'
import * as Y from 'yjs'
import WebSocket from 'ws'
import { Hocuspocus } from '../../packages/server/src'
import { HocuspocusProvider } from '../../packages/provider/src'

const ydoc = new Y.Doc()

context('provider/onConnect', () => {
  it('executes the onConnect callback', done => {
    const server = new Hocuspocus()
    server.configure({ port: 4000 }).listen()

    const client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
      maxAttempts: 1,
      onConnect: () => {
        client.destroy()
        server.destroy()
        done()
      },
    })
  })

  it("executes the on('connect') callback", done => {
    const server = new Hocuspocus()
    server.configure({ port: 4000 }).listen()

    const client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
      maxAttempts: 1,
    })

    client.on('connect', () => {
      server.destroy()
      client.destroy()
      done()
    })
  })

  it.skip('doesn’t execute the onConnect callback when the server throws an error', done => {
    const server = new Hocuspocus()
    server.configure({
      port: 4000,
      async onConnect() {
        throw new Error()
      },
    }).listen()

    const client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
      maxAttempts: 1,
      onConnect: () => {
        assert.fail('onConnect must not be executed')
      },
      onClose: () => {
        client.destroy()
        server.destroy()
        done()
      },
    })
  })
})
