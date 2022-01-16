import test from 'ava'
import { Redis } from '@hocuspocus/extension-redis'
import {
  newHocuspocus, newHocuspocusProvider, sleep, redisConnectionSettings,
} from '../utils'

test.failing('adds and removes connections properly', async t => {
  const server = newHocuspocus({
    extensions: [
      new Redis({
        ...redisConnectionSettings,
        identifier: 'server',
        prefix: 'extension-redis/getConnectionCount',
      }),
    ],
  })

  const anotherServer = newHocuspocus({
    extensions: [
      new Redis({
        ...redisConnectionSettings,
        identifier: 'anotherServer',
        prefix: 'extension-redis/getConnectionCount',
      }),
    ],
  })

  const providers = [
    newHocuspocusProvider(server),
    newHocuspocusProvider(anotherServer),
  ]
  await sleep(100)

  t.is(server.getConnectionsCount(), 2)

  providers.forEach(provider => provider.disconnect())
  await sleep(100)

  t.is(server.getConnectionsCount(), 0)
})
