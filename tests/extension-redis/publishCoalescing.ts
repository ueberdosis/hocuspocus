import { describe, expect, test } from 'vite-plus/test'

import { Redis } from '@hocuspocus/extension-redis'
import { Document, IncomingMessage, MessageType } from '@hocuspocus/server'
import {
  newHocuspocus,
  newHocuspocusProvider,
  redisConnectionSettings,
  sleep,
} from '../utils/index.ts'
import { retryableAssertion } from '../utils/retryableAssertion.ts'

/**
 * Counts what actually reaches Redis by wrapping the extension's publisher.
 */
const countingRedis = () => {
  const extension = new Redis({
    ...redisConnectionSettings,
    identifier: `server${crypto.randomUUID()}`,
  })

  const publisher = (extension as any).pub
  const original = publisher.publish.bind(publisher)
  let published = 0

  publisher.publish = (...args: any[]) => {
    published += 1

    return original(...args)
  }

  return { extension, publishCount: () => published, reset: () => (published = 0) }
}

describe('publishCoalescing', () => {
  test('coalesces a burst of changes into a single publish', async t => {
    const redis = countingRedis()
    const server = await newHocuspocus({ extensions: [redis.extension] })

    const provider = newHocuspocusProvider(server, {
      name: 'redis-coalescing',
      awareness: null,
    })

    await new Promise(resolve => provider.on('synced', () => resolve('done')))
    await sleep(300)
    redis.reset()

    // Drive the burst on the server's own document. Twenty separate transactions
    // applied synchronously are guaranteed to share one event loop turn; sending
    // them through the provider would leave frame delivery, and therefore the
    // turn boundaries, outside the test's control.
    const document = server.documents.get('redis-coalescing')

    expect(document).toBeTruthy()

    const map = document!.getMap('test')
    for (let i = 0; i < 20; i += 1) {
      map.set(`key-${i}`, i)
    }

    await sleep(300)

    // Without coalescing this is one SyncStep1 publish per change, so 20.
    expect(redis.publishCount()).toBe(1)
  })

  test('a failing sync publish does not swallow the awareness publish', async t => {
    const extension = new Redis({
      ...redisConnectionSettings,
      identifier: `server${crypto.randomUUID()}`,
    })

    const server = await newHocuspocus({ extensions: [extension] })
    const provider = newHocuspocusProvider(server, {
      name: 'redis-publish-failure',
    })

    await new Promise(resolve => provider.on('synced', () => resolve('done')))
    await sleep(300)

    // Reject the sync step specifically, by message type rather than by call
    // order, and let everything else publish normally.
    const publisher = (extension as any).pub
    const original = publisher.publish.bind(publisher)
    const attempted: number[] = []
    const succeeded: number[] = []

    publisher.publish = (key: string, payload: Buffer) => {
      const [, messageBuffer] = (extension as any).decodeMessage(payload)
      const message = new IncomingMessage(messageBuffer)

      message.readVarString() // document name

      const messageType = message.readVarUint()

      attempted.push(messageType)

      if (messageType === MessageType.Sync) {
        return Promise.reject(new Error('redis is down'))
      }

      succeeded.push(messageType)

      return original(key, payload)
    }

    // Both applied server-side and synchronously, so they share one turn and
    // therefore one pending entry — which is the case under test.
    const document = server.documents.get('redis-publish-failure')

    expect(document).toBeTruthy()

    document!.getMap('test').set('a', 1)
    document!.awareness.setLocalState({ user: 'jan' })

    await sleep(300)

    expect(attempted.includes(MessageType.Sync), 'the sync step was attempted').toBe(true)
    expect(
      succeeded.includes(MessageType.Awareness),
      'the awareness update was published despite the sync step failing',
    ).toBe(true)
  })

  test("a reloaded document does not inherit the previous instance's pending publish", async t => {
    const extension = new Redis({
      ...redisConnectionSettings,
      identifier: `server${crypto.randomUUID()}`,
    })

    const server = await newHocuspocus({ extensions: [extension] })
    const provider = newHocuspocusProvider(server, {
      name: 'redis-reload',
      awareness: null,
    })

    await new Promise(resolve => provider.on('synced', () => resolve('done')))

    const first = server.documents.get('redis-reload')

    expect(first).toBeTruthy()

    // A fast reconnect can replace the Document under an unchanged name while a
    // publish is still buffered, because `afterUnloadDocument` returns early and
    // never clears it. Buffering against the old instance and then scheduling
    // against a new one must not carry the stale document forward.
    const schedule = (extension as any).schedulePublish.bind(extension)
    const pending = (extension as any).pendingPublishes

    schedule('redis-reload', first)
    expect(pending.get('redis-reload').document).toBe(first)

    const reloaded = new Document('redis-reload')

    expect(schedule('redis-reload', reloaded).document).toBe(reloaded)
    expect(pending.get('redis-reload').document).toBe(reloaded)

    reloaded.destroy()
  })

  test('a coalesced burst still reaches another instance', async t => {
    const server = await newHocuspocus({
      extensions: [
        new Redis({
          ...redisConnectionSettings,
          identifier: `server${crypto.randomUUID()}`,
        }),
      ],
    })

    const anotherServer = await newHocuspocus({
      extensions: [
        new Redis({
          ...redisConnectionSettings,
          identifier: `anotherServer${crypto.randomUUID()}`,
        }),
      ],
    })

    const provider = newHocuspocusProvider(server, {
      name: 'redis-coalescing-sync',
      awareness: null,
    })
    const anotherProvider = newHocuspocusProvider(anotherServer, {
      name: 'redis-coalescing-sync',
      awareness: null,
    })

    await new Promise(resolve => anotherProvider.on('synced', () => resolve('done')))

    const map = provider.document.getMap('test')
    for (let i = 0; i < 20; i += 1) {
      map.set(`key-${i}`, i)
    }

    // Every change of the collapsed burst has to arrive, not just the last one.
    await retryableAssertion(() => {
      const received = anotherProvider.document.getMap('test')

      for (let i = 0; i < 20; i += 1) {
        expect(received.get(`key-${i}`)).toBe(i)
      }
    })
  })
})
