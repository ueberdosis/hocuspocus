import assert from 'assert'
import * as Y from 'yjs'
import WebSocket from 'ws'
import { Hocuspocus } from '../../packages/server/src'
import { HocuspocusProvider } from '../../packages/provider/src'

let client

context('provider/onSynced', () => {
  afterEach(() => {
    client.destroy()
  })

  it('onSynced callback is executed', done => {
    const ydoc = new Y.Doc()

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
    const ydoc = new Y.Doc()

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
    const ydoc = new Y.Doc()

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
    const ydoc = new Y.Doc()

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

  it('send all messages according to the protocol', done => {
    const ydoc = new Y.Doc()

    const Server = new Hocuspocus()
    Server.configure({
      port: 4000,

      async onCreateDocument({ document }) {
        document.getArray('foo').insert(0, ['bar'])

        return document
      },
    })
    Server.enableDebugging()
    Server.listen()

    client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
      onSynced: () => {
        assert.deepStrictEqual(Server.getMessageLogs(), [
          { direction: 'out', type: 'Sync', category: 'SyncStep1' },
          { direction: 'in', type: 'Sync', category: 'SyncStep1' },
          { direction: 'in', type: 'Awareness', category: 'Update' },
          // TODO: That should output `type: 'Sync'`, right?
          { direction: 'in', type: 'Auth', category: 'Update' },
        ])

        Server.destroy()

        done()
      },
    })
  })

  it('onSynced callback is executed when the document is actually synced, even if it takes longer', done => {
    const ydoc = new Y.Doc()

    const Server = new Hocuspocus()
    Server.configure({
      port: 4000,

      async onCreateDocument({ document }) {
        // sleep for 100ms
        await new Promise(resolve => setTimeout(resolve, 100))

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
