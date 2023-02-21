import test from 'ava'
import { Redis } from '@hocuspocus/extension-redis'
import { v4 as uuidv4 } from 'uuid'
import { newHocuspocus, newHocuspocusProvider, redisConnectionSettings } from '../utils'

test('syncs broadcast stateless message between servers and clients', async t => {
  await new Promise(async resolve => {
    const payloadToSend = 'STATELESS-MESSAGE'
    const server = await newHocuspocus({
      extensions: [
        new Redis({
          ...redisConnectionSettings,
          identifier: `server${uuidv4()}`,
        }),
      ],
    })

    const anotherServer = await newHocuspocus({
      extensions: [
        new Redis({
          ...redisConnectionSettings,
          identifier: `anotherServer${uuidv4()}`,
        }),
      ],
    })

    // Once we’re setup make an edit on anotherProvider. To get to the provider it will need
    // to pass through Redis:
    // provider -> server -> Redis -> anotherServer -> anotherProvider

    // Wait for a stateless message to confirm whether another provider has the same payload.
    newHocuspocusProvider(anotherServer, {
      onStateless: ({ payload }) => {
        t.is(payload, payloadToSend)
        t.pass()
        resolve('done')
      },
    })

    // Once the initial data is synced, send a stateless message
    newHocuspocusProvider(server, {
      onSynced() {
        server.documents.get('hocuspocus-test')?.broadcastStateless(payloadToSend)
      },
    })
  })
})
