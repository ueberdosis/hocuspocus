import { AsyncLocalStorage } from 'node:async_hooks'
import { type ActiveContext, getActiveContext } from '@hocuspocus/server'
import test from 'ava'
import { newHocuspocus, newHocuspocusProvider, sleep } from '../utils/index.ts'

test('getActiveContext returns undefined outside of hooks', t => {
  t.is(getActiveContext(), undefined)
})

test('getActiveContext reads a storage shared on globalThis, so the CJS and ESM builds agree', t => {
  const storage = (globalThis as any)[Symbol.for('@hocuspocus/server/activeContext')] as AsyncLocalStorage<ActiveContext>
  t.true(storage instanceof AsyncLocalStorage)

  const active = { context: { user: 1 }, documentName: 'doc', socketId: 'socket' }
  t.is(storage.run(active, () => getActiveContext()), active)
})

test('getActiveContext exposes the connection in every connection hook', async t => {
  t.timeout(10_000)
  const mockContext = { correlationId: 'abc-123', user: 42 }
  const seen = new Map<string, { active: ActiveContext | undefined, socketId: string, documentName: string }>()

  const record = (name: string) => async (payload: any) => {
    // Also check the context survives an await inside the hook
    await sleep(1)
    seen.set(name, {
      active: getActiveContext(),
      socketId: payload.socketId ?? payload.connection?.socketId,
      documentName: payload.documentName,
    })
  }

  await new Promise<void>(async resolve => {
    const server = await newHocuspocus(t, {
      onConnect: record('onConnect'),
      async onAuthenticate(payload) {
        await record('onAuthenticate')(payload)
        return mockContext
      },
      // onCreateDocument is only available to extensions
      extensions: [{ onCreateDocument: record('onCreateDocument') }],
      onLoadDocument: record('onLoadDocument'),
      afterLoadDocument: record('afterLoadDocument'),
      connected: record('connected'),
      beforeHandleMessage: record('beforeHandleMessage'),
      afterHandleMessage: record('afterHandleMessage'),
      beforeSync: record('beforeSync'),
      async onChange(payload) {
        await record('onChange')(payload)
        resolve()
      },
    })

    const provider = newHocuspocusProvider(t, server, {
      token: 'token',
      onSynced() {
        provider.document.getArray('foo').insert(0, ['bar'])
      },
    })
  })

  const socketIds = new Set([...seen.values()].map(entry => entry.socketId))
  t.is(socketIds.size, 1)

  for (const [name, { active, socketId, documentName }] of seen) {
    t.truthy(active, `${name} has an active context`)
    t.is(active?.socketId, socketId, name)
    t.is(active?.documentName, documentName, name)
  }

  for (const name of ['onCreateDocument', 'onLoadDocument', 'afterLoadDocument', 'connected', 'beforeHandleMessage', 'afterHandleMessage', 'beforeSync', 'onChange']) {
    t.deepEqual(seen.get(name)?.active?.context, mockContext, name)
  }

  // The scope doesn't leak into the caller.
  t.is(getActiveContext(), undefined)
})

test('getActiveContext is undefined in store and unload hooks, also after the connection is gone', async t => {
  t.timeout(10_000)
  const seen: Record<string, ActiveContext | undefined | 'unset'> = {
    onStoreDocument: 'unset',
    afterStoreDocument: 'unset',
    beforeUnloadDocument: 'unset',
    afterUnloadDocument: 'unset',
  }

  await new Promise<void>(async resolve => {
    const server = await newHocuspocus(t, {
      debounce: 300,
      async onAuthenticate() {
        return { user: 'alice' }
      },
      async onChange() {
        // Disconnect while the store is still debounced, so its timer was
        // created while a message of this connection was being processed.
        provider.destroy()
      },
      async onStoreDocument() {
        seen.onStoreDocument = getActiveContext()
      },
      async afterStoreDocument() {
        seen.afterStoreDocument = getActiveContext()
      },
      async beforeUnloadDocument() {
        seen.beforeUnloadDocument = getActiveContext()
      },
      async afterUnloadDocument() {
        seen.afterUnloadDocument = getActiveContext()
        resolve()
      },
    })

    const provider = newHocuspocusProvider(t, server, {
      token: 'token',
      onSynced() {
        provider.document.getArray('foo').insert(0, ['bar'])
      },
    })
  })

  t.deepEqual(seen, {
    onStoreDocument: undefined,
    afterStoreDocument: undefined,
    beforeUnloadDocument: undefined,
    afterUnloadDocument: undefined,
  })
})

test('getActiveContext exposes the context of a direct connection', async t => {
  t.timeout(10_000)
  const directContext = { user: 'server-job' }
  const seen: Record<string, ActiveContext | undefined> = {}

  const server = await newHocuspocus(t, {
    async onLoadDocument() {
      seen.onLoadDocument = getActiveContext()
    },
    async onChange() {
      seen.onChange = getActiveContext()
    },
    async onStoreDocument() {
      seen.onStoreDocument = getActiveContext()
    },
  })

  const direct = await server.openDirectConnection('direct-doc', directContext)
  await direct.transact(document => {
    document.getArray('foo').insert(0, ['bar'])
  })
  await direct.disconnect()

  t.deepEqual(seen.onLoadDocument?.context, directContext)
  t.is(seen.onLoadDocument?.documentName, 'direct-doc')
  t.deepEqual(seen.onChange?.context, directContext)
  t.is(seen.onChange?.documentName, 'direct-doc')
  t.is(seen.onStoreDocument, undefined)
})

test('getActiveContext reflects context added by onTokenSync', async t => {
  t.timeout(10_000)
  let tokenSynced = false

  const result = await new Promise<{ onChange: unknown, beforeHandleMessage: unknown }>(async resolve => {
    let beforeHandleMessage: unknown

    const server = await newHocuspocus(t, {
      async onAuthenticate() {
        return { user: 'alice', claims: 'old' }
      },
      async onTokenSync() {
        tokenSynced = true
        return { claims: 'new' }
      },
      async beforeHandleMessage() {
        if (tokenSynced) {
          beforeHandleMessage = getActiveContext()?.context
        }
      },
      async onChange() {
        if (tokenSynced) {
          resolve({ onChange: getActiveContext()?.context, beforeHandleMessage })
        }
      },
    })

    const provider = newHocuspocusProvider(t, server, {
      token: 'token',
      async onSynced() {
        provider.sendToken()
        while (!tokenSynced) {
          await sleep(10)
        }
        provider.document.getArray('foo').insert(0, ['bar'])
      },
    })
  })

  t.deepEqual(result.beforeHandleMessage, { user: 'alice', claims: 'new' })
  t.deepEqual(result.onChange, { user: 'alice', claims: 'new' })
})

test('a hook rejecting with a non-object closes the connection instead of stalling it', async t => {
  t.timeout(10_000)
  let throwOnce = true

  await new Promise<void>(async resolve => {
    const server = await newHocuspocus(t, {
      async beforeHandleMessage() {
        if (throwOnce) {
          throwOnce = false
          // eslint-disable-next-line no-throw-literal
          throw 'forbidden'
        }
      },
      async onDisconnect() {
        resolve()
      },
    })

    newHocuspocusProvider(t, server)
  })

  t.pass()
})
