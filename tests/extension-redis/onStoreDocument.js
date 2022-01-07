import assert from 'assert'
import * as Y from 'yjs'
import WebSocket from 'ws'
import { Hocuspocus } from '@hocuspocus/server'
import { Redis } from '@hocuspocus/extension-redis'
import { HocuspocusProvider } from '@hocuspocus/provider'

const server = new Hocuspocus()
const anotherServer = new Hocuspocus()
const persistWait = 1000

const redisConfiguration = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379,
}

context('extension-redis/onStoreDocument', () => {
  after(() => {
    server.destroy()
    anotherServer.destroy()
  })

  it('syncs updates between servers and clients', done => {
    const ydoc = new Y.Doc()
    const anotherYdoc = new Y.Doc()

    class CustomStorageExtension {
      async onStoreDocument({ document, instance }) {
        console.log(`${instance.configuration.name} onStoreDocument`)
        assert.strictEqual(document.getArray('foo').get(0), anotherYdoc.getArray('foo').get(0))
        assert.strictEqual(document.getArray('foo').get(0), ydoc.getArray('foo').get(0))
        done()
      }
    }

    server.configure({
      port: 4000,
      name: 'redis-1',
      extensions: [
        new Redis({
          ...redisConfiguration,
          identifier: 'server',
          prefix: 'extension-redis/onStoreDocument',
        }),
        new CustomStorageExtension(),
      ],
    }).listen()

    anotherServer.configure({
      port: 4001,
      name: 'redis-2',
      extensions: [
        new Redis({
          ...redisConfiguration,
          identifier: 'anotherServer',
          prefix: 'extension-redis/onStoreDocument',
        }),
        new CustomStorageExtension(),
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

    const anotherClient = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4001',
      name: 'hocuspocus-test',
      document: anotherYdoc,
      WebSocketPolyfill: WebSocket,
      maxAttempts: 1,
      broadcast: false,
      onSynced: () => {
        // once we're setup make an edit on anotherClient, if all succeeds the onStoreDocument
        // callback will be called after the debounce period and all docs will
        // be identical
        // anotherYdoc.getArray('foo').insert(0, ['bar'])
        client.destroy()
        anotherClient.destroy()
      },
    })
  })
}).timeout(persistWait * 2)
