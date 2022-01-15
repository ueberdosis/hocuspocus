import test from 'ava'
import { Redis } from '@hocuspocus/extension-redis'
import { newHocuspocus, newHocuspocusProvider } from '../utils'

const connectionSettings = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '', 10) || 6379,
}

test('syncs updates between servers and clients', async t => {
  await new Promise(resolve => {
    const server = newHocuspocus({
      extensions: [
        new Redis({
          ...connectionSettings,
          identifier: 'server',
        }),
      ],
    })

    const anotherServer = newHocuspocus({
      extensions: [
        new Redis({
          ...connectionSettings,
          identifier: 'anotherServer',
        }),
      ],
    })

    // Once we’re setup make an edit on anotherProvider. To get to the provider it will need
    // to pass through Redis:
    // provider -> server -> Redis -> anotherServer -> anotherProvider
    const provider = newHocuspocusProvider(server, {
      onSynced() {
        provider.document.getArray('foo').insert(0, ['bar'])
      },
    })

    // Once the initial data is synced, wait for an additional update to check
    // if both documents have the same content.
    const anotherProvider = newHocuspocusProvider(anotherServer, {
      onSynced() {
        provider.on('message', () => {
          setTimeout(() => {
            t.is(
              provider.document.getArray('foo').get(0),
              anotherProvider.document.getArray('foo').get(0),
            )

            resolve('done')
          }, 10)
        })
      },
    })
  })
})
