import { describe, expect, test } from 'vite-plus/test'

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

describe('broadcastEncoding', () => {
  test('encodes a document update once and shares it across connections', t => {
    const document = newDocument()

    const first = addConnection(document, 'hocuspocus-test')
    const second = addConnection(document, 'hocuspocus-test')
    const third = addConnection(document, 'hocuspocus-test')

    document.getMap('test').set('foo', 'bar')

    expect(first.sent.length).toBe(1)
    expect(second.sent.length).toBe(1)
    expect(third.sent.length).toBe(1)

    // The same buffer instance reaches every connection, so it was encoded once.
    expect(first.sent[0]).toBe(second.sent[0])
    expect(first.sent[0]).toBe(third.sent[0])
  })

  test('encodes an awareness update once and shares it across connections', t => {
    const document = newDocument()

    const first = addConnection(document, 'hocuspocus-test')
    const second = addConnection(document, 'hocuspocus-test')

    document.awareness.setLocalState({ foo: 'bar' })

    expect(first.sent.length).toBe(1)
    expect(second.sent.length).toBe(1)
    expect(first.sent[0]).toBe(second.sent[0])
  })

  test('encodes a stateless broadcast once and shares it across connections', t => {
    const document = newDocument()

    const first = addConnection(document, 'hocuspocus-test')
    const second = addConnection(document, 'hocuspocus-test')

    document.broadcastStateless('{"event":"document.saved"}')

    expect(first.sent.length).toBe(1)
    expect(second.sent.length).toBe(1)
    expect(first.sent[0]).toBe(second.sent[0])
  })

  test('a filtered stateless broadcast only reaches matching connections', t => {
    const document = newDocument()

    const first = addConnection(document, 'hocuspocus-test')
    const skipped = addConnection(document, 'hocuspocus-test')
    const third = addConnection(document, 'hocuspocus-test')

    document.broadcastStateless(
      '{"event":"document.saved"}',
      connection => connection !== (skipped as any),
    )

    expect(first.sent.length).toBe(1)
    expect(skipped.sent.length).toBe(0)
    expect(third.sent.length).toBe(1)

    // A skipped connection in the middle must not cost the others their shared buffer.
    expect(first.sent[0]).toBe(third.sent[0])
  })

  test('addresses stateless broadcasts per connection', t => {
    const document = newDocument()

    const legacy = addConnection(document, 'hocuspocus-test')
    const session = addConnection(document, makeRoutingKey('hocuspocus-test', 'session-a'))

    document.broadcastStateless('{"event":"document.saved"}')

    expect(readAddress(legacy.sent[0])).toBe('hocuspocus-test')
    expect(readAddress(session.sent[0])).toBe(makeRoutingKey('hocuspocus-test', 'session-a'))
    expect(legacy.sent[0]).not.toBe(session.sent[0])
  })

  test('reuses the buffer across consecutive connections sharing an address', t => {
    const document = newDocument()

    const legacy = addConnection(document, 'hocuspocus-test')
    const sessionA = addConnection(document, makeRoutingKey('hocuspocus-test', 'session-a'))
    const sessionAToo = addConnection(document, makeRoutingKey('hocuspocus-test', 'session-a'))
    const sessionB = addConnection(document, makeRoutingKey('hocuspocus-test', 'session-b'))

    document.getMap('test').set('foo', 'bar')

    expect(sessionA.sent[0]).toBe(sessionAToo.sent[0])
    expect(legacy.sent[0]).not.toBe(sessionA.sent[0])
    expect(sessionA.sent[0]).not.toBe(sessionB.sent[0])

    const buffers = new Set([
      legacy.sent[0],
      sessionA.sent[0],
      sessionAToo.sent[0],
      sessionB.sent[0],
    ])
    expect(buffers.size).toBe(3)
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
      expect(connection.sent.length).toBe(2)

      for (const message of connection.sent) {
        expect(readAddress(message)).toBe(connection.messageAddress)
      }
    }
  })
})
