import test from 'ava'
import { WebSocketStatus } from '@hocuspocus/provider'
import { Redis } from '@hocuspocus/extension-redis'
import { v4 as uuidv4 } from 'uuid'
import {
  newHocuspocus, newHocuspocusProvider, redisConnectionSettings,
} from '../utils/index.js'
import { retryableAssertion } from '../utils/retryableAssertion.js'

test.skip('closes connections on other instances', async t => {
  const server = await newHocuspocus({
    extensions: [
      new Redis({
        ...redisConnectionSettings,
        identifier: `server${uuidv4()}`,
        prefix: 'extension-redis/closeConnections',
      }),
    ],
  })

  const anotherServer = await newHocuspocus({
    extensions: [
      new Redis({
        ...redisConnectionSettings,
        identifier: `anotherServer${uuidv4()}`,
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

  server.closeConnections()

  await retryableAssertion(t, tt => {
    tt.is(provider.status, WebSocketStatus.Disconnected)
  })

})
