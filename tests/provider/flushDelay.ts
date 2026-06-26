import test from 'ava'
import { newHocuspocus, newHocuspocusProvider, sleep } from '../utils/index.ts'
import { retryableAssertion } from '../utils/retryableAssertion.ts'

test('batches rapid document updates into a single outgoing message', async t => {
  const server = await newHocuspocus(t)
  let updateMessages = 0

  await new Promise(resolve => {
    const provider = newHocuspocusProvider(t, server, {
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
        t.is(updateMessages, 0)

        await sleep(300)

        // The three updates were merged into a single message.
        t.is(updateMessages, 1)
        resolve('done')
      },
    })
  })
})

test('a merged batch still converges on another client', async t => {
  const server = await newHocuspocus(t)

  const provider = newHocuspocusProvider(t, server, {
    awareness: null,
    flushDelay: 100,
  })

  await new Promise(resolve => {
    provider.on('synced', () => resolve('done'))
  })

  provider.document.getMap('test').set('a', 1)
  provider.document.getMap('test').set('b', 2)
  provider.document.getMap('test').set('c', 3)

  const reader = newHocuspocusProvider(t, server, { awareness: null })

  await retryableAssertion(t, tt => {
    const map = reader.document.getMap('test')
    tt.is(map.get('a'), 1)
    tt.is(map.get('b'), 2)
    tt.is(map.get('c'), 3)
  })
})

test('sends one message per update when flushDelay is disabled', async t => {
  const server = await newHocuspocus(t)
  let updateMessages = 0

  await new Promise(resolve => {
    const provider = newHocuspocusProvider(t, server, {
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

        t.is(updateMessages, 3)
        resolve('done')
      },
    })
  })
})

test('reports unsynced changes during the batch window and clears after sync', async t => {
  const server = await newHocuspocus(t)

  const provider = newHocuspocusProvider(t, server, {
    awareness: null,
    flushDelay: 100,
  })

  await new Promise(resolve => {
    provider.on('synced', () => resolve('done'))
  })

  provider.document.getMap('test').set('a', 1)
  provider.document.getMap('test').set('b', 2)

  // Buffered but not yet sent — still counts as unsynced.
  t.is(provider.hasUnsyncedChanges, true)

  await retryableAssertion(t, tt => {
    tt.is(provider.hasUnsyncedChanges, false)
  })
})

test('collapses rapid awareness changes into a single outgoing message', async t => {
  const server = await newHocuspocus(t)
  let awarenessMessages = 0

  await new Promise(resolve => {
    const provider = newHocuspocusProvider(t, server, {
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

        t.is(awarenessMessages, 1)
        resolve('done')
      },
    })
  })
})
