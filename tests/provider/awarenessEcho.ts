import { describe, expect, test } from 'vite-plus/test'

import type { HocuspocusProvider } from '@hocuspocus/provider'
import { newHocuspocus, newHocuspocusProvider, sleep } from '../utils/index.ts'
import { retryableAssertion } from '../utils/retryableAssertion.ts'

const AWARENESS_MESSAGE = 'Awareness states update'

const hasAwarenessField = (provider: HocuspocusProvider) =>
  Array.from(provider.awareness?.getStates().values() ?? []).some(state => state.foo === 'bar')

describe('awarenessEcho', () => {
  test('does not echo awareness received from the server back to it', async t => {
    const server = await newHocuspocus()

    const first = newHocuspocusProvider(server, { name: 'awareness-echo' })

    let outgoingAwarenessMessages = 0
    const second = newHocuspocusProvider(server, {
      name: 'awareness-echo',
      onOutgoingMessage({ message }) {
        if (message.description === AWARENESS_MESSAGE) {
          outgoingAwarenessMessages += 1
        }
      },
    })

    await new Promise(resolve => second.on('synced', () => resolve('done')))

    // Ignore whatever the handshake produced; only the reaction to a remote
    // change is under test here.
    await sleep(100)
    outgoingAwarenessMessages = 0

    first.setAwarenessField('foo', 'bar')

    // The remote state does arrive, so the assertion below is not vacuous.
    await retryableAssertion(() => {
      expect(hasAwarenessField(second)).toBe(true)
    })

    await sleep(100)

    expect(outgoingAwarenessMessages).toBe(0)
  })

  test('still sends awareness changes that originate locally', async t => {
    const server = await newHocuspocus()

    const first = newHocuspocusProvider(server, { name: 'awareness-local' })
    const second = newHocuspocusProvider(server, { name: 'awareness-local' })

    await new Promise(resolve => second.on('synced', () => resolve('done')))

    second.setAwarenessField('foo', 'bar')

    await retryableAssertion(() => {
      expect(hasAwarenessField(first)).toBe(true)
    })
  })

  test('still tells the server when a client goes away', async t => {
    const server = await newHocuspocus()

    const first = newHocuspocusProvider(server, { name: 'awareness-destroy' })
    const second = newHocuspocusProvider(server, { name: 'awareness-destroy' })

    await new Promise(resolve => second.on('synced', () => resolve('done')))

    second.setAwarenessField('foo', 'bar')

    await retryableAssertion(() => {
      expect(hasAwarenessField(first)).toBe(true)
    })

    second.destroy()

    await retryableAssertion(() => {
      expect(hasAwarenessField(first)).toBe(false)
    })
  })
})
