import test from 'ava'
import { Redis } from '@hocuspocus/extension-redis'
import { uuidv4 } from 'lib0/random'
import {
  newHocuspocus, newHocuspocusProvider, redisConnectionSettings,
} from '../utils/index.js'
import { retryableAssertion } from '../utils/retryableAssertion.js'

test.skip('adds and removes connections properly', async t => {
  const server = await newHocuspocus({
    extensions: [
      new Redis({
        ...redisConnectionSettings,
        identifier: `server${uuidv4()}`,
        prefix: 'extension-redis/getDocumentsCount',
      }),
    ],
  })

  const anotherServer = await newHocuspocus({
    extensions: [
      new Redis({
        ...redisConnectionSettings,
        identifier: `anotherServer${uuidv4()}`,
        prefix: 'extension-redis/getDocumentsCount',
      }),
    ],
  })

  const providers = [
    newHocuspocusProvider(server, {
      name: 'foo',
    }),
    newHocuspocusProvider(anotherServer, {
      name: 'bar',
    }),
  ]

  await retryableAssertion(t, tt => {
    tt.is(server.getDocumentsCount(), 2)
  })

  providers.forEach(provider => provider.disconnect())

  await retryableAssertion(t, tt => {
    tt.is(server.getDocumentsCount(), 0)
  })
})
