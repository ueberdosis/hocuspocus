import test from 'ava'
import { Redis } from '@hocuspocus/extension-redis'
import { newHocuspocus, newHocuspocusProvider, redisConnectionSettings } from '../utils'
import { v4 as uuidv4 } from 'uuid';

test('syncs updates between servers and clients', async t => {
  await new Promise(resolve => {
    const server = newHocuspocus({
      extensions: [
        new Redis({
          ...redisConnectionSettings,
          identifier: 'server' + uuidv4(),
        }),
      ],
    })

    const anotherServer = newHocuspocus({
      extensions: [
        new Redis({
          ...redisConnectionSettings,
          identifier: 'anotherServer' + uuidv4(),
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
          }, 200)
        })
      },
    })
  })
})
