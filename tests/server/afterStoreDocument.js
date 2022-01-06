import * as Y from 'yjs'
import WebSocket from 'ws'
import { Hocuspocus } from '@hocuspocus/server'
import { HocuspocusProvider } from '@hocuspocus/provider'

let client

context('server/afterStoreDocument', () => {
  it('calls the afterStoreDocument hook', done => {
    const ydoc = new Y.Doc()
    const server = new Hocuspocus()

    server.configure({
      port: 4000,
      async afterStoreDocument() {
        server.destroy()
        client.destroy()
        done()
      },
    }).listen()

    client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
    })

    client.on('synced', () => {
      client.destroy()
    })
  })

  it('executes afterStoreDocument callback from an extension', done => {
    const ydoc = new Y.Doc()
    const server = new Hocuspocus()
    let triggered = false

    class CustomExtension {
      async afterStoreDocument() {
        if (triggered) {
          return
        }

        triggered = true

        server.destroy()
        client.destroy()
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

    client.on('synced', () => {
      ydoc.getArray('foo').insert(0, ['bar'])
    })
  })
})
