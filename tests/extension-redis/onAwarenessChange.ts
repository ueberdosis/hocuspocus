import test from 'ava'
import { Redis } from '@hocuspocus/extension-redis'
import { onAwarenessChangeParameters } from '@hocuspocus/provider'
import { v4 as uuidv4 } from 'uuid'
import { newHocuspocus, newHocuspocusProvider, redisConnectionSettings } from '../utils/index.js'

test('syncs existing awareness state', async t => {
  await new Promise(async resolve => {
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

    const provider = newHocuspocusProvider(server, {
      onSynced() {
        // Once we’re set up, change the local Awareness state.
        // The updated state then needs to go through Redis:
        // provider -> server -> Redis -> anotherServer -> anotherProvider
        provider.setAwarenessField('name', 'first')

        // Time to initialize a second provider, and connect to `anotherServer`
        // to check whether existing Awareness states are synced through Redis.
        newHocuspocusProvider(anotherServer, {
          onAwarenessChange({ states }: onAwarenessChangeParameters) {
            t.is(states.length, 2)

            const state = states.find(state => state.clientId === provider.document.clientID)
            t.is(state?.name, 'first')

            resolve('done')
          },
        })
      },
    })
  })
})

test('syncs awareness between servers and clients', async t => {
  await new Promise(async resolve => {
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

    const provider = newHocuspocusProvider(anotherServer, {
      name: 'another-document',
      onSynced() {
        // once we're setup change awareness on provider, to get to client it will
        // need to pass through the pubsub extension:
        // provider -> anotherServer -> pubsub -> server -> client
        provider.setAwarenessField('name', 'second')
      },
    })

    newHocuspocusProvider(server, {
      name: 'another-document',
      onAwarenessChange: ({ states }: onAwarenessChangeParameters) => {
        t.is(states.length, 2)

        const state = states.find(state => state.clientId === provider.document.clientID)
        t.is(state?.name, 'second')

        resolve('done')
      },
    })
  })
})
