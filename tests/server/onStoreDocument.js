import assert from 'assert'
import * as Y from 'yjs'
import WebSocket from 'ws'
import { Hocuspocus } from '@hocuspocus/server'
import { HocuspocusProvider } from '@hocuspocus/provider'

let client

context('server/onStoreDocument', () => {
  it('onStoreDocument callback is called before the document is removed from memory', done => {
    const ydoc = new Y.Doc()
    const server = new Hocuspocus()

    server.configure({
      port: 4000,
      async onStoreDocument({ document }) {
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

  it('onStoreDocument callback receives document updates', done => {
    const ydoc = new Y.Doc()
    const server = new Hocuspocus()

    let triggered = false

    server.configure({
      port: 4000,
      async onStoreDocument({ document }) {
        if (triggered) {
          return
        }

        triggered = true

        const value = document.getArray('foo').get(0)
        assert.strictEqual(value, 'bar')

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
      ydoc.getArray('foo').insert(0, ['bar'])
    })
  })

  it('executes onStoreDocument callback from an extension', done => {
    const ydoc = new Y.Doc()
    const server = new Hocuspocus()
    let triggered = false

    class CustomExtension {
      async onStoreDocument({ document }) {
        if (triggered) {
          return
        }

        triggered = true

        const value = document.getArray('foo').get(0)
        assert.strictEqual(value, 'bar')

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

  it('stops when one of the onStoreDocument hooks throws an error', done => {
    const ydoc = new Y.Doc()
    const server = new Hocuspocus()
    let triggered = false

    class BreakingTheChain {
      async onStoreDocument() {
        setTimeout(() => {
          if (triggered) {
            return
          }

          triggered = true

          server.destroy()
          client.destroy()
          done()
        }, 100)

        // Stop it!
        throw new Error()
      }
    }

    class NotExecuted {
      async onStoreDocument() {
        // This MUST NOT be executed.
        server.destroy()
        client.destroy()
        done()
      }
    }

    server.configure({
      port: 4000,
      extensions: [
        new BreakingTheChain(),
        new NotExecuted(),
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

  it('has the server instance', done => {
    const ydoc = new Y.Doc()
    const server = new Hocuspocus()
    let triggered = false

    server.configure({
      port: 4000,
      async onStoreDocument({ instance }) {
        if (triggered) {
          return
        }

        triggered = true
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

    client.on('synced', () => {
      ydoc.getArray('foo').insert(0, ['bar'])
    })
  })
})
