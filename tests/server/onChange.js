import assert from 'assert'
import * as Y from 'yjs'
import WebSocket from 'ws'
import { Hocuspocus } from '@hocuspocus/server'
import { HocuspocusProvider } from '@hocuspocus/provider'

let client

context('server/onChange', () => {
  it('onChange callback receives updates', done => {
    const ydoc = new Y.Doc()
    const server = new Hocuspocus()

    const mockContext = {
      user: 123,
    }
    let triggered = false

    server.configure({
      port: 4000,
      async onConnect() {
        return mockContext
      },
      async onChange({ document, context }) {
        const value = document.getArray('foo').get(0)
        assert.deepStrictEqual(context, mockContext)

        if (!triggered && value === 'bar') {
          triggered = true
          assert.strictEqual(value, 'bar')

          server.destroy()
          client.destroy()
          done()
        }
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

  it('executes onChange callback from an extension', done => {
    const ydoc = new Y.Doc()
    const server = new Hocuspocus()
    let triggered = false

    class CustomExtension {
      async onChange({ document }) {
        const value = document.getArray('foo').get(0)

        if (!triggered && value === 'bar') {
          triggered = true
          assert.strictEqual(value, 'bar')

          server.destroy()
          client.destroy()
          done()
        }
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

  it('onChange callback is not called after onLoadDocument', done => {
    const ydoc = new Y.Doc()
    const server = new Hocuspocus()
    let triggered = false

    server.configure({
      port: 4000,
      async onChange(data) {
        triggered = true
      },
      async onLoadDocument({ document }) {
        document.getArray('foo').insert(0, ['bar'])
        return document
      },
    }).listen()

    client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
    })

    client.on('synced', () => {
      if (triggered) {
        throw new Error('onChange should not be called unless client updates')
      }

      server.destroy()
      client.destroy()
      done()
    })
  })

  it('has the server instance', done => {
    const ydoc = new Y.Doc()
    const server = new Hocuspocus()

    server.configure({
      port: 4000,
      async onChange({ instance }) {
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
