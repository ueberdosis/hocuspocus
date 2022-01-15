import test from 'ava'
import * as Y from 'yjs'
import { onStoreDocumentPayload } from '@hocuspocus/server'
import { Redis } from '@hocuspocus/extension-redis'
import { HocuspocusProvider } from '@hocuspocus/provider'
import { newHocuspocus, newHocuspocusProvider, sleep } from '../utils'

const connectionSettings = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '', 10) || 6379,
}

test('syncs updates between servers and clients', async t => {
  await new Promise(resolve => {
    const ydoc = new Y.Doc()
    const anotherYdoc = new Y.Doc()

    class CustomStorageExtension {
      async onStoreDocument({ document, instance }: onStoreDocumentPayload) {
        t.is(document.getArray('foo').get(0), 'bar')
        t.is(document.getArray('foo').get(0), anotherYdoc.getArray('foo').get(0))
        t.is(document.getArray('foo').get(0), ydoc.getArray('foo').get(0))
        resolve('done')
      }
    }

    const server = newHocuspocus({
      name: 'redis-1',
      extensions: [
        new Redis({
          ...connectionSettings,
          identifier: 'server',
          prefix: 'extension-redis/onStoreDocument',
        }),
        new CustomStorageExtension(),
      ],
    })

    const anotherServer = newHocuspocus({
      name: 'redis-2',
      extensions: [
        new Redis({
          ...connectionSettings,
          identifier: 'anotherServer',
          prefix: 'extension-redis/onStoreDocument',
        }),
        new CustomStorageExtension(),
      ],
    })

    newHocuspocusProvider(server, {
      document: ydoc,
    })

    const anotherProvider = newHocuspocusProvider(anotherServer, {
      document: anotherYdoc,
      onSynced: () => {
      // once we're setup make an edit on anotherProvider, if all succeeds the onStoreDocument
      // callback will be called after the debounce period and all docs will
      // be identical
        anotherYdoc.getArray('foo').insert(0, ['bar'])
        anotherProvider.destroy()
      },
    })
  })
})

test('stores documents when the last client disconnects', async t => {
  await new Promise(resolve => {
    let provider: HocuspocusProvider

    const server = newHocuspocus({
      extensions: [
        new Redis({
          prefix: 'extension-redis/onStoreDocument',
          ...connectionSettings,
        }),
      ],
      onStoreDocument: async ({ document }) => {
        t.is(
          provider.document.getArray('foo').get(0),
          document.getArray('foo').get(0),
        )

        resolve('done')
      },
    })

    provider = newHocuspocusProvider(server, {
      onSynced() {
        provider.document.getArray('foo').insert(0, ['bar'])
        provider.disconnect()
      },
    })
  })
})
