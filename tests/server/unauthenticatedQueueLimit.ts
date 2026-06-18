import test from 'ava'
import * as encoding from 'lib0/encoding'
import { writeAuthentication } from '@hocuspocus/common'
import { newHocuspocus } from '../utils/index.ts'

// Wire-level MessageType values (mirrors packages/server/src/types.ts).
const MessageType = {
  Auth: 2,
  Stateless: 5,
}

const buildStatelessFrame = (documentName: string, payloadSize: number): Uint8Array => {
  const encoder = encoding.createEncoder()
  encoding.writeVarString(encoder, documentName)
  encoding.writeVarUint(encoder, MessageType.Stateless)
  encoding.writeVarString(encoder, 'A'.repeat(payloadSize))
  return encoding.toUint8Array(encoder)
}

const buildAuthFrame = (documentName: string, token: string): Uint8Array => {
  const encoder = encoding.createEncoder()
  encoding.writeVarString(encoder, documentName)
  encoding.writeVarUint(encoder, MessageType.Auth)
  writeAuthentication(encoder, token)
  return encoding.toUint8Array(encoder)
}

const openRawSocket = (url: string): Promise<WebSocket> => new Promise((resolve, reject) => {
  const ws = new WebSocket(url)
  ws.binaryType = 'arraybuffer'
  ws.addEventListener('open', () => resolve(ws), { once: true })
  ws.addEventListener('error', (event) => reject(event), { once: true })
})

// Wait for the server to close the socket, returning the close code.
const waitForClose = (ws: WebSocket, timeoutMs = 5000): Promise<number> => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('connection was not closed by the server')), timeoutMs)
  ws.addEventListener('close', (event) => {
    clearTimeout(timer)
    resolve(event.code)
  }, { once: true })
})

test('closes an unauthenticated connection that exceeds the pre-auth message-count limit', async t => {
  const server = await newHocuspocus(t, {
    maxUnauthenticatedQueueMessages: 5,
  })

  const attacker = await openRawSocket(server.server!.webSocketURL)
  t.teardown(() => attacker.close())

  const closed = waitForClose(attacker)

  // Flood many small non-Auth frames before authenticating. The server must
  // stop queuing and close the connection once the count limit is exceeded.
  for (let i = 0; i < 50; i += 1) {
    attacker.send(buildStatelessFrame('queue-count-doc', 16))
  }

  const code = await closed
  t.is(code, 4205, 'connection should be closed with ResetConnection (4205)')
})

test('closes an unauthenticated connection that exceeds the pre-auth byte limit', async t => {
  const server = await newHocuspocus(t, {
    // 256 KB total budget across the unauthenticated queue.
    maxUnauthenticatedQueueSize: 256 * 1024,
  })

  const attacker = await openRawSocket(server.server!.webSocketURL)
  t.teardown(() => attacker.close())

  const closed = waitForClose(attacker)

  // Each frame carries ~64 KB; the 5th frame crosses the 256 KB budget.
  for (let i = 0; i < 20; i += 1) {
    attacker.send(buildStatelessFrame('queue-bytes-doc', 64 * 1024))
  }

  const code = await closed
  t.is(code, 4205, 'connection should be closed with ResetConnection (4205)')
})

test('closes an unauthenticated connection that opens too many pending documents', async t => {
  const server = await newHocuspocus(t, {
    maxPendingDocuments: 3,
  })

  const attacker = await openRawSocket(server.server!.webSocketURL)
  t.teardown(() => attacker.close())

  const closed = waitForClose(attacker)

  // Spread a single small frame across many distinct document keys. A per-key
  // limit alone would not catch this amplification; a per-connection cap does.
  for (let i = 0; i < 25; i += 1) {
    attacker.send(buildStatelessFrame(`pending-doc-${i}`, 16))
  }

  const code = await closed
  t.is(code, 4205, 'connection should be closed with ResetConnection (4205)')
})

test('closes a continuously-sending unauthenticated connection once the pre-auth timeout elapses', async t => {
  const server = await newHocuspocus(t, {
    timeout: 1000,
    // Keep queue limits high so the timeout — not the queue cap — is what fires.
    maxUnauthenticatedQueueMessages: 1_000_000,
    maxUnauthenticatedQueueSize: 1024 * 1024 * 1024,
  })

  const attacker = await openRawSocket(server.server!.webSocketURL)

  const closed = waitForClose(attacker, 6000)

  // Keep refreshing activity with tiny frames. The pre-auth deadline must not
  // be reset by inbound traffic, so the connection still closes.
  const interval = setInterval(() => {
    if (attacker.readyState === WebSocket.OPEN) {
      attacker.send(buildStatelessFrame('timeout-doc', 8))
    }
  }, 200)
  t.teardown(() => {
    clearInterval(interval)
    attacker.close()
  })

  const code = await closed
  clearInterval(interval)
  t.is(code, 4408, 'connection should be closed with ConnectionTimeout (4408)')
})

test('does not close an authenticated connection that later exceeds the pre-auth limits', async t => {
  const server = await newHocuspocus(t, {
    maxUnauthenticatedQueueMessages: 5,
    maxUnauthenticatedQueueSize: 64 * 1024,
  })

  const attacker = await openRawSocket(server.server!.webSocketURL)
  t.teardown(() => attacker.close())

  // Authenticate first (no onAuthenticate hook => allowed).
  const authenticated = new Promise<void>((resolve) => {
    attacker.addEventListener('message', () => resolve(), { once: true })
  })
  attacker.send(buildAuthFrame('authenticated-doc', ''))
  await authenticated

  // After auth, large/many frames flow through the established connection and
  // are not subject to the pre-auth queue caps.
  let closedEarly = false
  attacker.addEventListener('close', () => { closedEarly = true }, { once: true })
  for (let i = 0; i < 50; i += 1) {
    attacker.send(buildStatelessFrame('authenticated-doc', 64 * 1024))
  }

  await new Promise((resolve) => setTimeout(resolve, 300))
  t.false(closedEarly, 'authenticated connection must not be closed by pre-auth queue limits')
})
