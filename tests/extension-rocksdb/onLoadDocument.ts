import test from 'ava'
import { RocksDB } from '@hocuspocus/extension-rocksdb'
import { createDirectory, newHocuspocus, newHocuspocusProvider, removeDirectory } from '../utils'

const path = 'database'

// Once it’s initialized it locks the folder for that process.
// So let’s just use the same instance for all tests.

const RocksDBExtension = new RocksDB({
  path,
})

test.serial.before(async () => {
  removeDirectory(path)
  createDirectory(path)
})

test.serial.after(() => {
  removeDirectory(path)
})

test.serial.skip('document is persisted', async t => {
  await new Promise(resolve => {
    const server = newHocuspocus({
      extensions: [
        RocksDBExtension,
      ],
    })

    const client = newHocuspocusProvider(server, {
      onSynced() {
        const valueBefore = client.document.getArray('foo').get(0)
        t.is(valueBefore, undefined)

        client.document.getArray('foo').insert(0, ['bar'])

        resolve('done')
      },
    })
  })
})

test.serial.skip('document can be restored', async t => {
  await new Promise(resolve => {
    const server = newHocuspocus({
      extensions: [
        RocksDBExtension,
      ],
    })

    const client = newHocuspocusProvider(server, {
      onSynced() {
        const value = client.document.getArray('foo').get(0)
        t.is(value, 'bar')

        resolve('done')
      },
    })
  })
})
