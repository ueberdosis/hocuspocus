import test from 'ava'
import type { HocuspocusProvider } from '@hocuspocus/provider'
import { newHocuspocus, newHocuspocusProvider, sleep } from '../utils/index.ts'
import { retryableAssertion } from '../utils/retryableAssertion.ts'

const AWARENESS_MESSAGE = 'Awareness states update'

const hasAwarenessField = (provider: HocuspocusProvider) =>
  Array.from(provider.awareness?.getStates().values() ?? []).some(state => state.foo === 'bar')

test('does not echo awareness received from the server back to it', async t => {
  const server = await newHocuspocus(t)

  const first = newHocuspocusProvider(t, server, { name: 'awareness-echo' })

  let outgoingAwarenessMessages = 0
  const second = newHocuspocusProvider(t, server, {
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
  await retryableAssertion(t, tt => {
    tt.true(hasAwarenessField(second))
  })

  await sleep(100)

  t.is(outgoingAwarenessMessages, 0)
})

test('still sends awareness changes that originate locally', async t => {
  const server = await newHocuspocus(t)

  const first = newHocuspocusProvider(t, server, { name: 'awareness-local' })
  const second = newHocuspocusProvider(t, server, { name: 'awareness-local' })

  await new Promise(resolve => second.on('synced', () => resolve('done')))

  second.setAwarenessField('foo', 'bar')

  await retryableAssertion(t, tt => {
    tt.true(hasAwarenessField(first))
  })
})

test('still tells the server when a client goes away', async t => {
  const server = await newHocuspocus(t)

  const first = newHocuspocusProvider(t, server, { name: 'awareness-destroy' })
  const second = newHocuspocusProvider(t, server, { name: 'awareness-destroy' })

  await new Promise(resolve => second.on('synced', () => resolve('done')))

  second.setAwarenessField('foo', 'bar')

  await retryableAssertion(t, tt => {
    tt.true(hasAwarenessField(first))
  })

  second.destroy()

  await retryableAssertion(t, tt => {
    tt.false(hasAwarenessField(first))
  })
})
