import test from 'ava'
import { Document } from '@hocuspocus/server'
import * as decoding from 'lib0/decoding'
import * as Y from 'yjs'
import { newHocuspocus, newHocuspocusProvider } from '../utils/index.ts'
import { retryableAssertion } from '../utils/retryableAssertion.ts'

type FakeConnection = {
  messageAddress: string
  sent: Uint8Array[]
  send: (message: Uint8Array) => void
}

const addConnection = (document: Document): FakeConnection => {
  const connection: FakeConnection = {
    messageAddress: document.name,
    sent: [],
    send(message: Uint8Array) {
      this.sent.push(message)
    },
  }

  document.connections.set(connection as any, { clients: new Set() })

  return connection
}

/** Resolves after the flush scheduled with `flushDelay: 0` has run. */
const tick = () => new Promise(resolve => setImmediate(resolve))

const readUpdate = (message: Uint8Array) => {
  const decoder = decoding.createDecoder(message)

  decoding.readVarString(decoder) // message address
  decoding.readVarUint(decoder) // MessageType.Sync
  decoding.readVarUint(decoder) // messageYjsUpdate

  return decoding.readVarUint8Array(decoder)
}

const readAwarenessStates = (message: Uint8Array) => {
  const decoder = decoding.createDecoder(message)

  decoding.readVarString(decoder) // message address
  decoding.readVarUint(decoder) // MessageType.Awareness

  const payload = decoding.createDecoder(decoding.readVarUint8Array(decoder))
  const states = new Map<number, any>()
  const count = decoding.readVarUint(payload)

  for (let i = 0; i < count; i += 1) {
    const clientId = decoding.readVarUint(payload)

    decoding.readVarUint(payload) // clock
    states.set(clientId, JSON.parse(decoding.readVarString(payload)))
  }

  return states
}

test('sends one message per change when flushDelay is false', t => {
  const document = new Document('hocuspocus-test')
  const connection = addConnection(document)

  document.getMap('test').set('a', 1)
  document.getMap('test').set('b', 2)
  document.getMap('test').set('c', 3)

  t.is(connection.sent.length, 3)
})

test('merges updates from the same tick into a single message', async t => {
  const document = new Document('hocuspocus-test', undefined, { flushDelay: 0 })
  const connection = addConnection(document)

  document.getMap('test').set('a', 1)
  document.getMap('test').set('b', 2)
  document.getMap('test').set('c', 3)

  // Nothing goes out synchronously; the flush is scheduled for the end of the turn.
  t.is(connection.sent.length, 0)

  await tick()

  t.is(connection.sent.length, 1)
})

test('the merged message carries every buffered change', async t => {
  const document = new Document('hocuspocus-test', undefined, { flushDelay: 0 })
  const connection = addConnection(document)

  document.getMap('test').set('a', 1)
  document.getMap('test').set('b', 2)
  document.getMap('test').set('c', 3)

  await tick()

  const target = new Y.Doc()

  Y.applyUpdate(target, readUpdate(connection.sent[0]))

  const map = target.getMap('test')

  t.is(map.get('a'), 1)
  t.is(map.get('b'), 2)
  t.is(map.get('c'), 3)
})

test('collapses awareness changes to the latest state of each client', async t => {
  const document = new Document('hocuspocus-test', undefined, { flushDelay: 0 })
  const connection = addConnection(document)

  document.awareness.setLocalState({ cursor: 1 })
  document.awareness.setLocalState({ cursor: 2 })
  document.awareness.setLocalState({ cursor: 3 })

  t.is(connection.sent.length, 0)

  await tick()

  t.is(connection.sent.length, 1)

  const states = readAwarenessStates(connection.sent[0])

  t.is(states.size, 1)
  t.is(states.get(document.clientID).cursor, 3)
})

test('flushes early once flushMaxBytes is buffered', t => {
  const document = new Document('hocuspocus-test', undefined, {
    flushDelay: 0,
    flushMaxBytes: 1,
  })
  const connection = addConnection(document)

  document.getMap('test').set('a', 1)
  document.getMap('test').set('b', 2)

  // Every update trips the limit, so each is sent without waiting for the flush.
  t.is(connection.sent.length, 2)
})

test('calls onUpdate synchronously for every change even when batching', t => {
  const document = new Document('hocuspocus-test', undefined, { flushDelay: 0 })
  const connection = addConnection(document)

  let updates = 0

  document.callbacks.onUpdate = () => {
    updates += 1
  }

  document.getMap('test').set('a', 1)
  document.getMap('test').set('b', 2)
  document.getMap('test').set('c', 3)

  // The broadcast is deferred, the hook that drives onChange / onStoreDocument
  // and the Redis publish is not.
  t.is(updates, 3)
  t.is(connection.sent.length, 0)
})

test('flush is a no-op when nothing is pending', t => {
  const document = new Document('hocuspocus-test', undefined, { flushDelay: 0 })
  const connection = addConnection(document)

  document.flush()
  document.flush()

  t.is(connection.sent.length, 0)
})

test('destroy flushes what is still buffered instead of dropping it', async t => {
  const batched = new Document('hocuspocus-test', undefined, { flushDelay: 0 })
  const batchedConnection = addConnection(batched)

  batched.getMap('test').set('a', 1)

  t.is(batchedConnection.sent.length, 0)

  batched.destroy()

  // Everything is out by the time destroy returns, and nothing is scheduled
  // afterwards.
  const afterDestroy = batchedConnection.sent.length

  await tick()

  t.is(batchedConnection.sent.length, afterDestroy)

  // The same document without batching emits exactly as many messages: the
  // buffered update plus the awareness teardown that destroy triggers.
  const unbatched = new Document('hocuspocus-test')
  const unbatchedConnection = addConnection(unbatched)

  unbatched.getMap('test').set('a', 1)
  unbatched.destroy()

  t.is(batchedConnection.sent.length, unbatchedConnection.sent.length)
})

test('a batching server still converges on connected clients', async t => {
  const server = await newHocuspocus(t, { flushDelay: 0 })

  const writer = newHocuspocusProvider(t, server, { name: 'flush-converge' })
  const reader = newHocuspocusProvider(t, server, { name: 'flush-converge' })

  await new Promise(resolve => reader.on('synced', () => resolve('done')))

  writer.document.getMap('test').set('a', 1)
  writer.document.getMap('test').set('b', 2)
  writer.document.getMap('test').set('c', 3)

  await retryableAssertion(t, tt => {
    const map = reader.document.getMap('test')

    tt.is(map.get('a'), 1)
    tt.is(map.get('b'), 2)
    tt.is(map.get('c'), 3)
  })
})

test('onChange still fires per change when batching is enabled', async t => {
  let changes = 0

  const server = await newHocuspocus(t, {
    flushDelay: 0,
    async onChange() {
      changes += 1
    },
  })

  const provider = newHocuspocusProvider(t, server, {
    name: 'flush-onchange',
    awareness: null,
  })

  await new Promise(resolve => provider.on('synced', () => resolve('done')))

  provider.document.getMap('test').set('a', 1)
  provider.document.getMap('test').set('b', 2)
  provider.document.getMap('test').set('c', 3)

  await retryableAssertion(t, tt => {
    tt.is(changes, 3)
  })
})
