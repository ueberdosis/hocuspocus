import assert from 'assert'
import * as Y from 'yjs'
import WebSocket from 'ws'
import { Hocuspocus } from '../../packages/server/src'
import { Redis } from '../../packages/redis/src'
import { HocuspocusProvider } from '../../packages/provider/src'
import flushRedis from '../utils/flushRedis'

const server = new Hocuspocus()

// Checks that data isn’t corrupted when restored from Redis
// https://github.com/ueberdosis/hocuspocus/issues/224#issuecomment-944550576
context('redis/onSynced', () => {
  before(() => {
    flushRedis()

    server.configure({
      port: 4000,
      extensions: [
        new Redis({
          host: process.env.REDIS_HOST || '127.0.0.1',
          port: process.env.REDIS_PORT || 6379,
        }),
      ],
    })
    server.enableDebugging()
    server.listen()
  })

  after(() => {
    server.destroy()

    flushRedis()
  })

  // create '#1'
  it('document is persisted', done => {
    const ydoc = new Y.Doc()
    const client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
      broadcast: false,
      onSynced: () => {
        const fragment = ydoc.getXmlFragment('XMLFragment')
        fragment.insert(fragment.length, [
          new Y.XmlText('#1'),
        ])

        assert.strictEqual(fragment.toString(), '#1')

        client.destroy()
        done()
      },
    })
  })

  // modify '#1#2'
  it('document can be modified', done => {
    const anotherYdoc = new Y.Doc()
    const client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: anotherYdoc,
      WebSocketPolyfill: WebSocket,
      onSynced: () => {
        const fragment = anotherYdoc.getXmlFragment('XMLFragment')
        fragment.insert(fragment.length, [
          new Y.XmlText('#2'),
        ])

        assert.strictEqual(fragment.toString(), '#1#2')

        client.destroy()
        done()
      },
    })
  })

  // restore '#1#2'
  it('document can be restored', done => {
    const theLastYdoc = new Y.Doc()
    const client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: theLastYdoc,
      WebSocketPolyfill: WebSocket,
      onSynced: () => {
        const fragment = theLastYdoc.getXmlFragment('XMLFragment')
        assert.strictEqual(fragment.toString(), '#1#2')

        client.destroy()
        done()
      },
    })
  })
})
