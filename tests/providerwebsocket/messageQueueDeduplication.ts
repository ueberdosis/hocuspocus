import test from 'ava'
import * as encoding from 'lib0/encoding'
import { HocuspocusProviderWebsocket } from '@hocuspocus/provider'
import { newHocuspocus } from '../utils/index.ts'

/**
 * Helper to create a raw message Uint8Array with a given documentName and messageType,
 * matching the wire format: VarString(documentName) + VarUint(messageType) + optional payload.
 */
function createRawMessage(documentName: string, messageType: number, payload?: Uint8Array): Uint8Array {
  const encoder = encoding.createEncoder()
  encoding.writeVarString(encoder, documentName)
  encoding.writeVarUint(encoder, messageType)
  if (payload) {
    encoding.writeVarUint8Array(encoder, payload)
  }
  return encoding.toUint8Array(encoder)
}

// MessageType enum values (matching provider/src/types.ts)
const MessageType = {
  Sync: 0,
  Awareness: 1,
  Auth: 2,
  QueryAwareness: 3,
  Stateless: 5,
  CLOSE: 7,
}

test('deduplicates awareness messages for the same document in the queue', async t => {
  const server = await newHocuspocus(t)

  const ws = new HocuspocusProviderWebsocket({
    url: server.server!.webSocketURL,
    autoConnect: false,
  })
  t.teardown(() => ws.destroy())

  // Queue multiple awareness messages for the same document
  const msg1 = createRawMessage('doc1', MessageType.Awareness, new Uint8Array([1]))
  const msg2 = createRawMessage('doc1', MessageType.Awareness, new Uint8Array([2]))
  const msg3 = createRawMessage('doc1', MessageType.Awareness, new Uint8Array([3]))

  ws.send(msg1)
  ws.send(msg2)
  ws.send(msg3)

  // Access the private messageQueue via cast
  const queue = (ws as any).messageQueue as Uint8Array[]
  t.is(queue.length, 1, 'should only have the latest awareness message')
  t.deepEqual(queue[0], msg3, 'should keep the last queued awareness message')
})

test('deduplicates QueryAwareness messages for the same document in the queue', async t => {
  const server = await newHocuspocus(t)

  const ws = new HocuspocusProviderWebsocket({
    url: server.server!.webSocketURL,
    autoConnect: false,
  })
  t.teardown(() => ws.destroy())

  const msg1 = createRawMessage('doc1', MessageType.QueryAwareness)
  const msg2 = createRawMessage('doc1', MessageType.QueryAwareness)

  ws.send(msg1)
  ws.send(msg2)

  const queue = (ws as any).messageQueue as Uint8Array[]
  t.is(queue.length, 1, 'should only have the latest QueryAwareness message')
  t.deepEqual(queue[0], msg2)
})

test('does not deduplicate awareness messages for different documents', async t => {
  const server = await newHocuspocus(t)

  const ws = new HocuspocusProviderWebsocket({
    url: server.server!.webSocketURL,
    autoConnect: false,
  })
  t.teardown(() => ws.destroy())

  const msg1 = createRawMessage('doc1', MessageType.Awareness, new Uint8Array([1]))
  const msg2 = createRawMessage('doc2', MessageType.Awareness, new Uint8Array([2]))

  ws.send(msg1)
  ws.send(msg2)

  const queue = (ws as any).messageQueue as Uint8Array[]
  t.is(queue.length, 2, 'should keep awareness messages for different documents')
})

test('does not deduplicate Sync messages', async t => {
  const server = await newHocuspocus(t)

  const ws = new HocuspocusProviderWebsocket({
    url: server.server!.webSocketURL,
    autoConnect: false,
  })
  t.teardown(() => ws.destroy())

  const msg1 = createRawMessage('doc1', MessageType.Sync, new Uint8Array([1]))
  const msg2 = createRawMessage('doc1', MessageType.Sync, new Uint8Array([2]))
  const msg3 = createRawMessage('doc1', MessageType.Sync, new Uint8Array([3]))

  ws.send(msg1)
  ws.send(msg2)
  ws.send(msg3)

  const queue = (ws as any).messageQueue as Uint8Array[]
  t.is(queue.length, 3, 'should keep all Sync messages')
})

test('does not deduplicate Stateless messages', async t => {
  const server = await newHocuspocus(t)

  const ws = new HocuspocusProviderWebsocket({
    url: server.server!.webSocketURL,
    autoConnect: false,
  })
  t.teardown(() => ws.destroy())

  const msg1 = createRawMessage('doc1', MessageType.Stateless, new Uint8Array([1]))
  const msg2 = createRawMessage('doc1', MessageType.Stateless, new Uint8Array([2]))

  ws.send(msg1)
  ws.send(msg2)

  const queue = (ws as any).messageQueue as Uint8Array[]
  t.is(queue.length, 2, 'should keep all Stateless messages')
})

test('deduplicates awareness but preserves sync messages in mixed queue', async t => {
  const server = await newHocuspocus(t)

  const ws = new HocuspocusProviderWebsocket({
    url: server.server!.webSocketURL,
    autoConnect: false,
  })
  t.teardown(() => ws.destroy())

  const sync1 = createRawMessage('doc1', MessageType.Sync, new Uint8Array([1]))
  const awareness1 = createRawMessage('doc1', MessageType.Awareness, new Uint8Array([10]))
  const sync2 = createRawMessage('doc1', MessageType.Sync, new Uint8Array([2]))
  const awareness2 = createRawMessage('doc1', MessageType.Awareness, new Uint8Array([20]))
  const sync3 = createRawMessage('doc1', MessageType.Sync, new Uint8Array([3]))

  ws.send(sync1)
  ws.send(awareness1)
  ws.send(sync2)
  ws.send(awareness2)
  ws.send(sync3)

  const queue = (ws as any).messageQueue as Uint8Array[]
  t.is(queue.length, 4, 'should have 3 sync + 1 awareness')
  t.deepEqual(queue[0], sync1)
  t.deepEqual(queue[1], sync2)
  t.deepEqual(queue[2], awareness2, 'should keep the latest awareness message')
  t.deepEqual(queue[3], sync3)
})
