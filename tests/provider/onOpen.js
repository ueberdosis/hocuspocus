import assert from 'assert'
import * as Y from 'yjs'
import WebSocket from 'ws'
import { Hocuspocus } from '@hocuspocus/server'
import { HocuspocusProvider } from '@hocuspocus/provider'

const ydoc = new Y.Doc()
const server = new Hocuspocus()

context('provider/onOpen', () => {
  before(() => {
    server.configure({ port: 4000 }).listen()
  })

  after(() => {
    server.destroy()
  })

  it('onOpen callback is executed', done => {
    const client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
      onOpen: () => {
        client.destroy()
        done()
      },
    })
  })

  it("on('open') callback is executed", done => {
    const client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
    })

    client.on('open', () => {
      client.destroy()
      done()
    })
  })
})
