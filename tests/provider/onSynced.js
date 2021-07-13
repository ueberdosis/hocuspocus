import assert from 'assert'
import * as Y from 'yjs'
import WebSocket from 'ws'
import { Hocuspocus } from '@hocuspocus/server/src'
import { HocuspocusProvider } from '../../packages/provider/src'

let client
const ydoc = new Y.Doc()

context('provider/onSynced', () => {
  afterEach(() => {
    client.destroy()
  })

  it('onSynced callback is executed', done => {
    const Server = new Hocuspocus()
    Server.configure({ port: 4000 }).listen()

    client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
      onSynced: () => {
        Server.destroy()

        done()
      },
    })
  })

  it("on('synced') callback is executed", done => {
    const Server = new Hocuspocus()
    Server.configure({ port: 4000 }).listen()

    client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
    })

    client.on('synced', () => {
      Server.destroy()

      done()
    })
  })

  it('onSynced callback is executed, even when the onConnect takes longer', done => {
    const Server = new Hocuspocus()
    Server.configure({
      port: 4000,

      async onConnect(data) {
        await new Promise((resolve, reject) => setTimeout(() => {
          resolve()
        }, 100))
      },
    }).listen()

    client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
      onSynced: () => {
        Server.destroy()

        done()
      },
    })
  })

  it('onSynced callback is executed when the document is actually synced', done => {
    const Server = new Hocuspocus()
    Server.configure({
      port: 4000,

      async onCreateDocument({ document }) {
        document.getArray('foo').insert(0, ['bar'])

        return document
      },
    }).listen()

    client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
      onSynced: () => {
        Server.destroy()

        const value = ydoc.getArray('foo').get(0)
        assert.strictEqual(value, 'bar')

        done()
      },
    })
  })
})
