import test from 'ava'
import { onStoreDocumentPayload } from '@hocuspocus/server'
import { Redis } from '@hocuspocus/extension-redis'
import { HocuspocusProvider } from '@hocuspocus/provider'
import { uuidv4 } from 'lib0/random'
import { newHocuspocus, newHocuspocusProvider, redisConnectionSettings } from '../utils/index.js'

test('stores documents without conflicts', async t => {
  await new Promise(async resolve => {
    let anotherProvider: HocuspocusProvider

    class CustomStorageExtension {
      async onStoreDocument({ document }: onStoreDocumentPayload) {
        t.is(document.getArray('foo').get(0), 'bar')
        t.is(document.getArray('foo').get(0), anotherProvider.document.getArray('foo').get(0))

        resolve('done')
      }
    }

    const server = await newHocuspocus({
      name: 'redis-1',
      extensions: [
        new Redis({
          ...redisConnectionSettings,
          identifier: `server${uuidv4()}`,
          prefix: 'extension-redis/onStoreDocument',
        }),
        new CustomStorageExtension(),
      ],
    })

    const anotherServer = await newHocuspocus({
      name: 'redis-2',
      extensions: [
        new Redis({
          ...redisConnectionSettings,
          identifier: `anotherServer${uuidv4()}`,
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
  await new Promise(async resolve => {
    let provider: HocuspocusProvider

    const server = await newHocuspocus({
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
