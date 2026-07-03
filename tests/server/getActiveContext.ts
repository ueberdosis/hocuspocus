import { getActiveContext } from '@hocuspocus/server'
import test from 'ava'
import { newHocuspocus, newHocuspocusProvider } from '../utils/index.ts'

test('getActiveContext returns undefined outside of message processing', t => {
  t.is(getActiveContext(), undefined)
})

test('getActiveContext exposes the connection context while a message is handled', async t => {
  const mockContext = { correlationId: 'abc-123', user: 42 }
  let done = false

  await new Promise(async resolve => {
    const finish = () => {
      if (done) return
      done = true
      resolve('done')
    }

    const server = await newHocuspocus(t, {
      async onConnect() {
        return mockContext
      },
      async beforeHandleMessage({ socketId, documentName }) {
        const active = getActiveContext()
        t.truthy(active)
        t.deepEqual(active?.context, mockContext)
        t.is(active?.documentName, documentName)
        t.is(active?.socketId, socketId)
      },
      async onChange() {
        // onChange fires during receiver.apply(), proving the async scope
        // covers the apply phase itself — not just the hooks bracketing it.
        t.deepEqual(getActiveContext()?.context, mockContext)
        finish()
      },
    })

    const provider = newHocuspocusProvider(t, server, {
      onSynced() {
        provider.document.getArray('foo').insert(0, ['bar'])
      },
    })
  })

  // The scope is confined to message processing.
  t.is(getActiveContext(), undefined)
})
