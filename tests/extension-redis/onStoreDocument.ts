import test from 'ava'
import { onStoreDocumentPayload } from '@hocuspocus/server'
import { Redis } from '@hocuspocus/extension-redis'
import { HocuspocusProvider } from '@hocuspocus/provider'
import { newHocuspocus, newHocuspocusProvider, redisConnectionSettings } from '../utils'

test('stores documents without conflicts', async t => {
  await new Promise(resolve => {
    let anotherProvider: HocuspocusProvider

    class CustomStorageExtension {
      async onStoreDocument({ document }: onStoreDocumentPayload) {
        t.is(document.getArray('foo').get(0), 'bar')
        t.is(document.getArray('foo').get(0), anotherProvider.document.getArray('foo').get(0))

        resolve('done')
      }
    }

    const server = newHocuspocus({
      name: 'redis-1',
      extensions: [
        new Redis({
          ...redisConnectionSettings,
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
          ...redisConnectionSettings,
          identifier: 'anotherServer',
          prefix: 'extension-redis/onStoreDocument',
        }),
        new CustomStorageExtension(),
      ],
    })

    newHocuspocusProvider(server)

    anotherProvider = newHocuspocusProvider(anotherServer, {
      onSynced() {
        // once we're setup make an edit on anotherProvider, if all succeeds the onStoreDocument
        // callback will be called after the debounce period and all docs will
        // be identical
        anotherProvider.document.getArray('foo').insert(0, ['bar'])
        anotherProvider.disconnect()
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
          ...redisConnectionSettings,
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
