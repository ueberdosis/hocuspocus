import assert from 'assert'
import * as Y from 'yjs'
import WebSocket from 'ws'
import { Hocuspocus } from '../../packages/server/src'
import { RocksDB } from '../../packages/rocksdb/src'
import { HocuspocusProvider } from '../../packages/provider/src'
import removeDirectory from '../utils/removeDirectory'

const ydoc = new Y.Doc()
const anotherYdoc = new Y.Doc()
const Server = new Hocuspocus()

context('rocksdb/onCreateDocument', () => {
  before(() => {
    removeDirectory('./database')

    Server.configure({
      port: 4000,
      extensions: [
        new RocksDB(),
      ],
    }).listen()
  })

  after(() => {
    Server.destroy()

    removeDirectory('./database')
  })

  it('document is persisted', done => {
    const client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: ydoc,
      WebSocketPolyfill: WebSocket,
      onSynced: () => {
        const valueBefore = ydoc.getArray('foo').get(0)
        assert.strictEqual(valueBefore, undefined)

        ydoc.getArray('foo').insert(0, ['bar'])

        client.destroy()
        done()
      },
    })
  })

  it('document can be restored', done => {
    const client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4000',
      name: 'hocuspocus-test',
      document: anotherYdoc,
      WebSocketPolyfill: WebSocket,
      onSynced: () => {
        const value = anotherYdoc.getArray('foo').get(0)
        assert.strictEqual(value, 'bar')

        client.destroy()
        done()
      },
    })
  })
})
