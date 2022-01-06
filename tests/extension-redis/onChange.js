import assert from 'assert'
import * as Y from 'yjs'
import WebSocket from 'ws'
import { Hocuspocus } from '@hocuspocus/server'
import { Redis } from '@hocuspocus/extension-redis'
import { HocuspocusProvider } from '@hocuspocus/provider'

const server = new Hocuspocus()
const anotherServer = new Hocuspocus()

const opts = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379,
}

context('extension-redis/onChange', () => {
  before(() => {
    server.configure({
      port: 4000,
      extensions: [
        new Redis({
          ...opts,
          identifier: 'server',
          log: () => {},
          // log: (...args) => console.log('server:', ...args),
        }),
      ],
    }).listen()

    anotherServer.configure({
      port: 4001,
      extensions: [
        new Redis({
          ...opts,
          identifier: 'anotherServer',
          log: () => {},
          // log: (...args) => console.log('anotherServer:', ...args),
        }),
      ],
    }).listen()
  })

  after(() => {
    server.destroy()
    anotherServer.destroy()
  })

  it('syncs updates between servers and clients', done => {
    const ydoc = new Y.Doc()
    const anotherYdoc = new Y.Doc()
    let anotherClient

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
          assert.strictEqual(ydoc.getArray('foo').get(0), anotherYdoc.getArray('foo').get(0))

          client.destroy()
          anotherClient.destroy()
          done()
        }, 0)
      })
    })

    anotherClient = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4001',
      name: 'hocuspocus-test',
      document: anotherYdoc,
      WebSocketPolyfill: WebSocket,
      maxAttempts: 1,
      broadcast: false,
      onSynced: () => {
        // once we're setup make an edit on anotherClient, to get to client it will need
        // to pass through the pubsub extension:
        // anotherClient -> anotherServer -> pubsub -> server -> client
        anotherYdoc.getArray('foo').insert(0, ['bar'])
      },
    })
  })
})
