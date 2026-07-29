import test from 'ava'
import { makeRoutingKey } from '@hocuspocus/common'
import { Document } from '@hocuspocus/server'
import * as decoding from 'lib0/decoding'

type FakeConnection = {
  messageAddress: string
  sent: Uint8Array[]
  send: (message: Uint8Array) => void
}

/**
 * Encoding is identical batched or not, so these tests opt out of batching to
 * keep every assertion synchronous.
 */
const newDocument = () => new Document('hocuspocus-test', undefined, { flushDelay: false })

/**
 * Registers a minimal stand-in for a Connection. The broadcast paths only read
 * `messageAddress` and call `send`, so a duck-typed object is enough to observe
 * what they produce.
 */
const addConnection = (document: Document, messageAddress: string): FakeConnection => {
  const connection: FakeConnection = {
    messageAddress,
    sent: [],
    send(message: Uint8Array) {
      this.sent.push(message)
    },
  }

  document.connections.set(connection as any, { clients: new Set() })

  return connection
}

const readAddress = (message: Uint8Array) => decoding.readVarString(decoding.createDecoder(message))

test('encodes a document update once and shares it across connections', t => {
  const document = newDocument()

  const first = addConnection(document, 'hocuspocus-test')
  const second = addConnection(document, 'hocuspocus-test')
  const third = addConnection(document, 'hocuspocus-test')

  document.getMap('test').set('foo', 'bar')

  t.is(first.sent.length, 1)
  t.is(second.sent.length, 1)
  t.is(third.sent.length, 1)

  // The same buffer instance reaches every connection, so it was encoded once.
  t.is(first.sent[0], second.sent[0])
  t.is(first.sent[0], third.sent[0])
})

test('encodes an awareness update once and shares it across connections', t => {
  const document = newDocument()

  const first = addConnection(document, 'hocuspocus-test')
  const second = addConnection(document, 'hocuspocus-test')

  document.awareness.setLocalState({ foo: 'bar' })

  t.is(first.sent.length, 1)
  t.is(second.sent.length, 1)
  t.is(first.sent[0], second.sent[0])
})

test('encodes a stateless broadcast once and shares it across connections', t => {
  const document = newDocument()

  const first = addConnection(document, 'hocuspocus-test')
  const second = addConnection(document, 'hocuspocus-test')

  document.broadcastStateless('{"event":"document.saved"}')

  t.is(first.sent.length, 1)
  t.is(second.sent.length, 1)
  t.is(first.sent[0], second.sent[0])
})

test('a filtered stateless broadcast only reaches matching connections', t => {
  const document = newDocument()

  const first = addConnection(document, 'hocuspocus-test')
  const skipped = addConnection(document, 'hocuspocus-test')
  const third = addConnection(document, 'hocuspocus-test')

  document.broadcastStateless('{"event":"document.saved"}', connection => connection !== (skipped as any))

  t.is(first.sent.length, 1)
  t.is(skipped.sent.length, 0)
  t.is(third.sent.length, 1)

  // A skipped connection in the middle must not cost the others their shared buffer.
  t.is(first.sent[0], third.sent[0])
})

test('addresses stateless broadcasts per connection', t => {
  const document = newDocument()

  const legacy = addConnection(document, 'hocuspocus-test')
  const session = addConnection(document, makeRoutingKey('hocuspocus-test', 'session-a'))

  document.broadcastStateless('{"event":"document.saved"}')

  t.is(readAddress(legacy.sent[0]), 'hocuspocus-test')
  t.is(readAddress(session.sent[0]), makeRoutingKey('hocuspocus-test', 'session-a'))
  t.not(legacy.sent[0], session.sent[0])
})

test('reuses the buffer across consecutive connections sharing an address', t => {
  const document = newDocument()

  const legacy = addConnection(document, 'hocuspocus-test')
  const sessionA = addConnection(document, makeRoutingKey('hocuspocus-test', 'session-a'))
  const sessionAToo = addConnection(document, makeRoutingKey('hocuspocus-test', 'session-a'))
  const sessionB = addConnection(document, makeRoutingKey('hocuspocus-test', 'session-b'))

  document.getMap('test').set('foo', 'bar')

  t.is(sessionA.sent[0], sessionAToo.sent[0])
  t.not(legacy.sent[0], sessionA.sent[0])
  t.not(sessionA.sent[0], sessionB.sent[0])

  const buffers = new Set([legacy.sent[0], sessionA.sent[0], sessionAToo.sent[0], sessionB.sent[0]])
  t.is(buffers.size, 3)
})

test('addresses every broadcast message to the receiving connection', t => {
  const document = newDocument()

  // Interleaved addresses: buffer reuse does not apply here, so this also
  // covers the fallback path where every connection gets its own encode.
  const connections = [
    addConnection(document, makeRoutingKey('hocuspocus-test', 'session-a')),
    addConnection(document, 'hocuspocus-test'),
    addConnection(document, makeRoutingKey('hocuspocus-test', 'session-a')),
    addConnection(document, makeRoutingKey('hocuspocus-test', 'session-b')),
  ]

  document.getMap('test').set('foo', 'bar')
  document.awareness.setLocalState({ foo: 'bar' })

  for (const connection of connections) {
    t.is(connection.sent.length, 2)

    for (const message of connection.sent) {
      t.is(readAddress(message), connection.messageAddress)
    }
  }
})
