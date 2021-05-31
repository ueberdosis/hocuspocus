import assert from 'assert'
import * as Y from 'yjs'
import WebSocket from 'ws'
import { Hocuspocus } from '../../packages/server/src'
import { RocksDB } from '../../packages/rocksdb/src'
import { HocuspocusClient } from '../../packages/client/src'
import rmdir from '../utils/rmdir'

let client
const ydoc = new Y.Doc()
const anotherYdoc = new Y.Doc()
const Server = new Hocuspocus()

context('rocksdb/onCreateDocument', () => {
  before(() => {
    rmdir('./database')

    Server.configure({
      port: 4000,
      extensions: [
        new RocksDB(),
      ],
    }).listen()
  })

  after(() => {
    Server.destroy()

    rmdir('./database')
  })

  afterEach(() => {
    client.destroy()
  })

  it('document are persisted', done => {
    client = new HocuspocusClient({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-demo',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
      onSynced: () => {
        setTimeout(() => {
          const valueBefore = ydoc.getArray('foo').get(0)
          assert.strictEqual(valueBefore, undefined)

          ydoc.getArray('foo').insert(0, ['bar'])

          setTimeout(() => {
            done()
          }, 100)
        }, 100)
      },
    })
  })

  it('document can be restored', done => {
    client = new HocuspocusClient({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-demo',
      document: anotherYdoc,
      WebSocketPolyfill: WebSocket,
      onSynced: () => {
        setTimeout(() => {
          const value = anotherYdoc.getArray('foo').get(0)
          assert.strictEqual(value, 'bar')

          done()
        }, 100)
      },
    })
  })
})
