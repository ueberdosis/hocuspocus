import assert from 'assert'
import * as Y from 'yjs'
import WebSocket from 'ws'
import { Hocuspocus } from '../../packages/server/src'
import { PubSub } from '../../packages/pubsub/src'
import { HocuspocusProvider } from '../../packages/provider/src'

const server = new Hocuspocus()
const server1 = new Hocuspocus()

const opts = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379,
}

context('pubsub/onChange', () => {
  before(() => {
    server.configure({
      port: 4000,
      extensions: [
        new PubSub({
          ...opts,
          instanceName: 'server',
          log: (...args) => console.log('server:', ...args),
        }),
      ],
    }).listen()

    server1.configure({
      port: 4001,
      extensions: [
        new PubSub({
          ...opts,
          instanceName: 'server1',
          log: (...args) => console.log('server1:', ...args),

        }),
      ],
    }).listen()
  })

  after(() => {
    server.destroy()
    server1.destroy()
  })

  it('syncs updates between servers and clients', done => {
    const ydoc = new Y.Doc()
    const ydoc1 = new Y.Doc()
    let client1

    const client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
      maxAttempts: 1,
      broadcast: false,
    })

    client.on('synced', () => {
      // wait for an update after we've synced and then check the doc content
      // matches the doc from the other client
      client.on('message', () => {
        setTimeout(() => {
          assert.strictEqual(ydoc.getArray('foo').get(0), ydoc1.getArray('foo').get(0))

          client.destroy()
          client1.destroy()
          done()
        }, 0)
      })
    })

    client1 = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4001',
      name: 'hocuspocus-test',
      document: ydoc1,
      WebSocketPolyfill: WebSocket,
      maxAttempts: 1,
      broadcast: false,
      onSynced: () => {
        // once we're setup make an edit on client1, to get to client it will need
        // to pass through the pubsub extension:
        // client1 -> server1 -> pubsub -> server -> client
        ydoc1.getArray('foo').insert(0, ['bar'])
      },
    })
  })
})
