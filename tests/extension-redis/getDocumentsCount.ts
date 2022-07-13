import test from 'ava'
import { Redis } from '@hocuspocus/extension-redis'
import {
  newHocuspocus, newHocuspocusProvider, sleep, redisConnectionSettings,
} from '../utils'
import {uuidv4} from "lib0/random";

test.skip('adds and removes connections properly', async t => {
  const server = newHocuspocus({
    extensions: [
      new Redis({
        ...redisConnectionSettings,
        identifier: 'server' + uuidv4(),
        prefix: 'extension-redis/getDocumentsCount',
      }),
    ],
  })

  const anotherServer = newHocuspocus({
    extensions: [
      new Redis({
        ...redisConnectionSettings,
        identifier: 'anotherServer' + uuidv4(),
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
  await sleep(100)

  t.is(server.getDocumentsCount(), 2)

  providers.forEach(provider => provider.disconnect())
  await sleep(100)

  t.is(server.getDocumentsCount(), 0)
})
