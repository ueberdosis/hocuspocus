import assert from 'assert'
import * as Y from 'yjs'
import WebSocket from 'ws'
import { Hocuspocus } from '../../packages/server/src'
import { HocuspocusProvider } from '../../packages/provider/src'

const ydoc = new Y.Doc()

context('provider/onMessage', () => {
  it('executes the onMessage callback', done => {
    const server = new Hocuspocus()
    server.configure({ port: 4000 }).listen()

    const client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
      onMessage: () => {
        client.destroy()
        server.destroy()
        done()
      },
    })
  })

  it("executes the on('message') callback", done => {
    const server = new Hocuspocus()
    server.configure({ port: 4000 }).listen()

    const client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
    })

    client.on('message', () => {
      client.destroy()
      server.destroy()
      done()
    })
  })
})
