import test from 'ava'
import * as encoding from 'lib0/encoding'
import { writeAuthentication } from '@hocuspocus/common'
import { newHocuspocus, newHocuspocusProvider } from '../utils/index.ts'

// Wire-level MessageType values (mirrors packages/server/src/types.ts).
const MessageType = {
  Auth: 2,
  Stateless: 5,
  BroadcastStateless: 6,
}

const buildAuthFrame = (documentName: string, token: string): Uint8Array => {
  const encoder = encoding.createEncoder()
  encoding.writeVarString(encoder, documentName)
  encoding.writeVarUint(encoder, MessageType.Auth)
  writeAuthentication(encoder, token)
  // providerVersion is optional on the server side, omit it.
  return encoding.toUint8Array(encoder)
}

const buildBroadcastStatelessFrame = (documentName: string, payload: string): Uint8Array => {
  const encoder = encoding.createEncoder()
  encoding.writeVarString(encoder, documentName)
  encoding.writeVarUint(encoder, MessageType.BroadcastStateless)
  encoding.writeVarString(encoder, payload)
  return encoding.toUint8Array(encoder)
}

const openRawSocket = (url: string): Promise<WebSocket> => new Promise((resolve, reject) => {
  const ws = new WebSocket(url)
  ws.binaryType = 'arraybuffer'
  ws.addEventListener('open', () => resolve(ws), { once: true })
  ws.addEventListener('error', (event) => reject(event), { once: true })
})

test('rejects client-sent BroadcastStateless (opcode 6) — payload must not reach peers', async t => {
  const documentName = 'hocuspocus-test'
  const attackerPayload = '{"spoof":"server-system-banner","marker":"LITMUS"}'

  let onStatelessCalls = 0
  let beforeBroadcastStatelessCalls = 0

  const server = await newHocuspocus(t, {
    async onAuthenticate({ token, connectionConfig }) {
      if (token === 'readonly') {
        connectionConfig.readOnly = true
      }
    },
    async onStateless() {
      onStatelessCalls += 1
    },
    async beforeBroadcastStateless() {
      beforeBroadcastStatelessCalls += 1
    },
  })

  const received: string[] = []
  const victimReady = new Promise<void>((resolve) => {
    newHocuspocusProvider(t, server, {
      name: documentName,
      token: 'read+write',
      onSynced: () => resolve(),
      onStateless: ({ payload }) => {
        received.push(payload)
      },
    })
  })

  await victimReady

  // Attacker: raw WebSocket using a readOnly token. Sends a single
  // BroadcastStateless (opcode 6) frame after a successful auth. The
  // server must reject this server-internal opcode and not fan it out.
  const attacker = await openRawSocket(server.server!.webSocketURL)
  t.teardown(() => attacker.close())

  const authenticated = new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('auth timeout')), 5000)
    attacker.addEventListener('message', () => {
      clearTimeout(timer)
      resolve()
    }, { once: true })
  })

  attacker.send(buildAuthFrame(documentName, 'readonly'))
  await authenticated

  attacker.send(buildBroadcastStatelessFrame(documentName, attackerPayload))

  // Give the server time to (incorrectly) fan out, if the bug is present.
  await new Promise((resolve) => setTimeout(resolve, 200))

  t.false(
    received.includes(attackerPayload),
    'victim must not receive payloads from client-sent BroadcastStateless frames',
  )
  t.is(onStatelessCalls, 0, 'onStateless must not fire for opcode 6 (it is not the Stateless opcode)')
  t.is(
    beforeBroadcastStatelessCalls,
    0,
    'beforeBroadcastStateless must not fire because the frame is rejected before fan-out',
  )
})
