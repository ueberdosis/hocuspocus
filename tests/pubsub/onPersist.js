import assert from 'assert'
import * as Y from 'yjs'
import WebSocket from 'ws'
import { Hocuspocus } from '../../packages/server/src'
import { PubSub } from '../../packages/pubsub/src'
import { HocuspocusProvider } from '../../packages/provider/src'

const server = new Hocuspocus()
const server1 = new Hocuspocus()
const persistWait = 1000

const opts = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379,
}

context('pubsub/onPersist', () => {
  after(() => {
    server.destroy()
    server1.destroy()
  })

  it('syncs updates between servers and clients', done => {
    const ydoc = new Y.Doc()
    const ydoc1 = new Y.Doc()

    const onPersist = document => {
      assert.strictEqual(document.getArray('foo').get(0), ydoc1.getArray('foo').get(0))
      assert.strictEqual(document.getArray('foo').get(0), ydoc.getArray('foo').get(0))
      done()
    }
    server.configure({
      port: 4000,
      extensions: [
        new PubSub({
          ...opts,
          log: (...args) => console.log('server:', ...args),
          persistWait,
          onPersist,
        }),
      ],
    }).listen()

    server1.configure({
      port: 4001,
      extensions: [
        new PubSub({
          ...opts,
          log: (...args) => console.log('server1:', ...args),
          persistWait,
          onPersist,
        }),
      ],
    }).listen()

    const client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
      maxAttempts: 1,
      broadcast: false,
    })

    const client1 = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4001',
      name: 'hocuspocus-test',
      document: ydoc1,
      WebSocketPolyfill: WebSocket,
      maxAttempts: 1,
      broadcast: false,
      onSynced: () => {
        // once we're setup make an edit on client1, if all succeeds the onPersist
        // callback will be called after the debounce period and all docs will
        // be identical
        ydoc1.getArray('foo').insert(0, ['bar'])
      },
    })
  })
}).timeout(persistWait * 2)
