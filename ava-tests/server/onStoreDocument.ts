import test from 'ava'
import { Redis } from '@hocuspocus/extension-redis'
import { HocuspocusProvider } from '@hocuspocus/provider'
import { newHocuspocus, newHocuspocusProvider, sleep } from '../utils'

const connectionSettings = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '', 10) || 6379,
}

test('stores documents when the last client disconnects', async t => {
  t.plan(1)

  let provider: HocuspocusProvider

  const server = await newHocuspocus({
    extensions: [
      new Redis({
        prefix: 'server/onStoreDocument',
        ...connectionSettings,
      }),
    ],
    onStoreDocument: async ({ document }) => {
      t.is(
        provider.document.getArray('foo').get(0),
        document.getArray('foo').get(0),
      )
    },
  })

  provider = newHocuspocusProvider(server, {
    onSynced() {
      provider.document.getArray('foo').insert(0, ['bar'])
      provider.disconnect()
    },
  })

  await sleep(100)
})
