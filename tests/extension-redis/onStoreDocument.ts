import test from 'ava'
import type { onStoreDocumentPayload } from '@hocuspocus/server'
import { Redis } from '@hocuspocus/extension-redis'
import type { HocuspocusProvider } from '@hocuspocus/provider'
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
          prefix: 'extension-redis/onStoreDocument1',
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
          prefix: 'extension-redis/onStoreDocument1',
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
          prefix: 'extension-redis/onStoreDocument2',
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

test('document gets unloaded on both servers after disconnection', async t => {
  await new Promise(async resolve => {
    class CustomStorageExtension {
      priority = 10

      onStoreDocument({ document }: onStoreDocumentPayload) {
        console.log('storing')
        return new Promise(resolve2 => {
          setTimeout(() => {
            console.log('stored')

            resolve2('')
          }, 3000)
        })
      }
    }

    const server = await newHocuspocus({
      name: 'redis-1',
      extensions: [
        new Redis({
          ...redisConnectionSettings,
          prefix: 'extension-redis/onStoreDocument3',
        }),
        new CustomStorageExtension(),
      ],
    })

    const anotherServer = await newHocuspocus({
      name: 'redis-2',
      extensions: [
        new Redis({
          ...redisConnectionSettings,
          prefix: 'extension-redis/onStoreDocument3',
        }),
        new CustomStorageExtension(),
      ],
    })

    const provider = newHocuspocusProvider(server)

    const anotherProvider = newHocuspocusProvider(anotherServer, {
      onSynced() {
        // once we're setup make an edit on anotherProvider, if all succeeds the onStoreDocument
        // callback will be called after the debounce period and all docs will
        // be identical
        anotherProvider.document.getArray('foo').insert(0, ['bar'])
        provider.document.getArray('foo2').insert(0, ['bar'])

        setTimeout(() => {
          provider.configuration.websocketProvider.disconnect()
          anotherProvider.configuration.websocketProvider.disconnect()

          setTimeout(() => {
            t.is(anotherServer.documents.size, 0)
            t.is(server.documents.size, 0)

            resolve('')
          }, 5000) // must be higher than RedisExtension.disconnectDelay
        }, 1500)

      },
    })
  })
})
