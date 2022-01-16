import test from 'ava'
import { WebSocketStatus } from '@hocuspocus/provider'
import { Redis } from '@hocuspocus/extension-redis'
import {
  newHocuspocus, newHocuspocusProvider, sleep, redisConnectionSettings,
} from '../utils'

test.failing('closes connections on other instances', async t => {
  const server = newHocuspocus({
    extensions: [
      new Redis({
        ...redisConnectionSettings,
        identifier: 'server',
        prefix: 'extension-redis/closeConnections',
      }),
    ],
  })

  const anotherServer = newHocuspocus({
    extensions: [
      new Redis({
        ...redisConnectionSettings,
        identifier: 'anotherServer',
        prefix: 'extension-redis/closeConnections',
      }),
    ],
  })

  const provider = newHocuspocusProvider(anotherServer, {
    onClose() {
      // Make sure it doesn’t reconnect.
      provider.disconnect()
    },
  })

  await sleep(100)

  server.closeConnections()

  await sleep(100)

  t.is(provider.status, WebSocketStatus.Disconnected)
})
