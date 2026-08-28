import { describe, expect, test } from 'vite-plus/test'

import { newHocuspocus, newHocuspocusProvider, sleep } from '../utils/index.ts'
import { retryableAssertion } from '../utils/retryableAssertion.ts'

describe('flushDelay', () => {
  test('batches rapid document updates into a single outgoing message', async t => {
    const server = await newHocuspocus()
    let updateMessages = 0

    await new Promise(resolve => {
      const provider = newHocuspocusProvider(server, {
        awareness: null,
        flushDelay: 100,
        onOutgoingMessage({ message }) {
          if (message.description === 'A document update') {
            updateMessages += 1
          }
        },
        async onSynced() {
          provider.document.getMap('test').set('a', 1)
          provider.document.getMap('test').set('b', 2)
          provider.document.getMap('test').set('c', 3)

          // Still inside the flush window: nothing has been sent yet.
          expect(updateMessages).toBe(0)

          await sleep(300)

          // The three updates were merged into a single message.
          expect(updateMessages).toBe(1)
          resolve('done')
        },
      })
    })
  })

  test('a merged batch still converges on another client', async t => {
    const server = await newHocuspocus()

    const provider = newHocuspocusProvider(server, {
      awareness: null,
      flushDelay: 100,
    })

    await new Promise(resolve => {
      provider.on('synced', () => resolve('done'))
    })

    provider.document.getMap('test').set('a', 1)
    provider.document.getMap('test').set('b', 2)
    provider.document.getMap('test').set('c', 3)

    const reader = newHocuspocusProvider(server, { awareness: null })

    await retryableAssertion(() => {
      const map = reader.document.getMap('test')
      expect(map.get('a')).toBe(1)
      expect(map.get('b')).toBe(2)
      expect(map.get('c')).toBe(3)
    })
  })

  test('sends one message per update when flushDelay is disabled', async t => {
    const server = await newHocuspocus()
    let updateMessages = 0

    await new Promise(resolve => {
      const provider = newHocuspocusProvider(server, {
        awareness: null,
        onOutgoingMessage({ message }) {
          if (message.description === 'A document update') {
            updateMessages += 1
          }
        },
        async onSynced() {
          provider.document.getMap('test').set('a', 1)
          provider.document.getMap('test').set('b', 2)
          provider.document.getMap('test').set('c', 3)

          await sleep(100)

          expect(updateMessages).toBe(3)
          resolve('done')
        },
      })
    })
  })

  test('reports unsynced changes during the batch window and clears after sync', async t => {
    const server = await newHocuspocus()

    const provider = newHocuspocusProvider(server, {
      awareness: null,
      flushDelay: 100,
    })

    await new Promise(resolve => {
      provider.on('synced', () => resolve('done'))
    })

    provider.document.getMap('test').set('a', 1)
    provider.document.getMap('test').set('b', 2)

    // Buffered but not yet sent — still counts as unsynced.
    expect(provider.hasUnsyncedChanges).toBe(true)

    await retryableAssertion(() => {
      expect(provider.hasUnsyncedChanges).toBe(false)
    })
  })

  test('collapses rapid awareness changes into a single outgoing message', async t => {
    const server = await newHocuspocus()
    let awarenessMessages = 0

    await new Promise(resolve => {
      const provider = newHocuspocusProvider(server, {
        flushDelay: 100,
        onOutgoingMessage({ message }) {
          if (message.description === 'Awareness states update') {
            awarenessMessages += 1
          }
        },
        async onSynced() {
          // Ignore any awareness sent as part of the initial sync.
          awarenessMessages = 0

          provider.setAwarenessField('cursor', 1)
          provider.setAwarenessField('cursor', 2)
          provider.setAwarenessField('cursor', 3)

          await sleep(300)

          expect(awarenessMessages).toBe(1)
          resolve('done')
        },
      })
    })
  })
})
