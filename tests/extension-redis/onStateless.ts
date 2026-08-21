import { Redis } from '@hocuspocus/extension-redis'
import test from 'ava'
import { newHocuspocus, newHocuspocusProvider, redisConnectionSettings } from '../utils/index.ts'

test('syncs broadcast stateless message between servers and clients', async t => {
  const redisPrefix = crypto.randomUUID()
  const payloadToSend = 'STATELESS-MESSAGE'
  let resolvePayload!: (payload: string) => void
  const payloadReceived = new Promise<string>(resolve => {
    resolvePayload = resolve
  })
  let resolveRemoteSynced!: () => void
  const remoteSynced = new Promise<void>(resolve => {
    resolveRemoteSynced = resolve
  })
  let resolveSenderSynced!: () => void
  const senderSynced = new Promise<void>(resolve => {
    resolveSenderSynced = resolve
  })

  const server = await newHocuspocus(t, {
    extensions: [
      new Redis({
        ...redisConnectionSettings,
        identifier: `server${crypto.randomUUID()}`,
        prefix: redisPrefix,
      }),
    ],
  })

  const anotherServer = await newHocuspocus(t, {
    extensions: [
      new Redis({
        ...redisConnectionSettings,
        identifier: `anotherServer${crypto.randomUUID()}`,
        prefix: redisPrefix,
      }),
    ],
  })

  newHocuspocusProvider(t, anotherServer, {
    onStateless({ payload }) {
      resolvePayload(payload)
    },
    onSynced() {
      resolveRemoteSynced()
    },
  })
  newHocuspocusProvider(t, server, {
    onSynced() {
      resolveSenderSynced()
    },
  })

  await Promise.all([remoteSynced, senderSynced])
  const document = server.documents.get('hocuspocus-test')
  if (!document) {
    throw new Error('Expected the document to be loaded')
  }
  document.broadcastStateless(payloadToSend)

  t.is(await payloadReceived, payloadToSend)
})

test('client stateless messages shouldnt propagate to other server', async t => {
  const redisPrefix = crypto.randomUUID()
  const payloadToSend = 'STATELESS-MESSAGE'
  const barrier = 'redis-barrier'
  const remotePayloads: string[] = []
  let resolveLocalPayload!: (payload: string) => void
  const localPayloadReceived = new Promise<string>(resolve => {
    resolveLocalPayload = resolve
  })
  let resolveRemoteSynced!: () => void
  const remoteSynced = new Promise<void>(resolve => {
    resolveRemoteSynced = resolve
  })
  let resolveRemoteBarrier!: () => void
  const remoteBarrierReceived = new Promise<void>(resolve => {
    resolveRemoteBarrier = resolve
  })
  let resolveSenderSynced!: () => void
  const senderSynced = new Promise<void>(resolve => {
    resolveSenderSynced = resolve
  })

  const server = await newHocuspocus(t, {
    extensions: [
      new Redis({
        ...redisConnectionSettings,
        identifier: `server${crypto.randomUUID()}`,
        prefix: redisPrefix,
      }),
    ],
    onStateless({ payload }) {
      resolveLocalPayload(payload)
    },
  })

  const anotherServer = await newHocuspocus(t, {
    extensions: [
      new Redis({
        ...redisConnectionSettings,
        identifier: `anotherServer${crypto.randomUUID()}`,
        prefix: redisPrefix,
      }),
    ],
  })

  newHocuspocusProvider(t, anotherServer, {
    onSynced() {
      resolveRemoteSynced()
    },
    onStateless({ payload }) {
      remotePayloads.push(payload)
      if (payload === barrier) {
        resolveRemoteBarrier()
      }
    },
  })
  const provider = newHocuspocusProvider(t, server, {
    onSynced() {
      resolveSenderSynced()
    },
  })

  await Promise.all([remoteSynced, senderSynced])
  provider.sendStateless(payloadToSend)
  t.is(await localPayloadReceived, payloadToSend)

  const document = server.documents.get('hocuspocus-test')
  if (!document) {
    throw new Error('Expected the document to be loaded')
  }
  document.broadcastStateless(barrier)
  await remoteBarrierReceived

  t.deepEqual(remotePayloads, [barrier])
})

test('server client stateless messages shouldnt propagate to other client', async t => {
  const redisPrefix = crypto.randomUUID()
  const response = 'test123'
  const barrier = 'redis-barrier'
  const remotePayloads: string[] = []

  let resolveResponse: () => void
  const responseReceived = new Promise<void>(resolve => {
    resolveResponse = resolve
  })
  let resolveRemoteSynced: () => void
  const remoteSynced = new Promise<void>(resolve => {
    resolveRemoteSynced = resolve
  })
  let resolveRemoteBarrier: () => void
  const remoteBarrierReceived = new Promise<void>(resolve => {
    resolveRemoteBarrier = resolve
  })
  let resolveSenderSynced: () => void
  const senderSynced = new Promise<void>(resolve => {
    resolveSenderSynced = resolve
  })

  const server = await newHocuspocus(t, {
    extensions: [
      new Redis({
        ...redisConnectionSettings,
        identifier: `server${crypto.randomUUID()}`,
        prefix: redisPrefix,
      }),
    ],
    async onStateless({ connection }) {
      connection.sendStateless(response)
    },
  })

  const anotherServer = await newHocuspocus(t, {
    extensions: [
      new Redis({
        ...redisConnectionSettings,
        identifier: `anotherServer${crypto.randomUUID()}`,
        prefix: redisPrefix,
      }),
    ],
    async onStateless() {
      t.fail()
    },
  })

  newHocuspocusProvider(t, anotherServer, {
    onSynced() {
      resolveRemoteSynced()
    },
    onStateless({ payload }) {
      if (payload === barrier) {
        resolveRemoteBarrier()
        return
      }
      remotePayloads.push(payload)
    },
  })

  const provider = newHocuspocusProvider(t, server, {
    onSynced() {
      resolveSenderSynced()
    },
    onStateless({ payload }) {
      if (payload === response) {
        resolveResponse()
      }
    },
  })

  await Promise.all([remoteSynced, senderSynced])
  provider.sendStateless('ok')
  await responseReceived

  const document = server.documents.get('hocuspocus-test')
  if (!document) {
    throw new Error('Expected the document to be loaded')
  }
  // Redis preserves publish order, so receiving this broadcast proves any
  // accidental propagation of the earlier response has already arrived.
  document.broadcastStateless(barrier)
  await remoteBarrierReceived

  t.deepEqual(remotePayloads, [])
})
