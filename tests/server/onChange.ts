import test from 'ava'
import type { onChangePayload } from '@hocuspocus/server'
import { newHocuspocus, newHocuspocusProvider } from '../utils/index.ts'
import { retryableAssertion } from '../utils/retryableAssertion.ts'

test('onChange callback receives updates', async t => {
  await new Promise(async resolve => {
    let resolved = false
    const mockContext = {
      user: 123,
    }

    const server = await newHocuspocus(t, {
      async onConnect() {
        return mockContext
      },
      async onChange({ document, context }) {
        if (resolved) return
        resolved = true

        t.deepEqual(context, mockContext)

        const value = document.getArray('foo').get(0)
        t.is(value, 'bar')

        resolve('done')
      },
    })

    const provider = newHocuspocusProvider(t, server, {
      onSynced() {
        provider.document.getArray('foo').insert(0, ['bar'])
      },
    })
  })
})

test('executes onChange callback from an extension', async t => {
  await new Promise(async resolve => {
    let resolved = false

    class CustomExtension {
      async onChange({ document }: onChangePayload) {
        if (resolved) return
        resolved = true

        const value = document.getArray('foo').get(0)

        t.is(value, 'bar')

        resolve('done')
      }
    }

    const server = await newHocuspocus(t, {
      extensions: [
        new CustomExtension(),
      ],
    })

    const provider = newHocuspocusProvider(t, server, {
      onSynced() {
        provider.document.getArray('foo').insert(0, ['bar'])
      },
    })
  })
})

test('onChange callback is not called after onLoadDocument', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus(t, {
      async onChange(data) {
        t.fail()
      },
      async onLoadDocument({ document }) {
        document.getArray('foo').insert(0, ['bar'])

        return document
      },
    })

    newHocuspocusProvider(t, server, {
      onSynced() {
        t.pass()
        resolve('done')
      },
    })
  })
})

test('has the server instance', async t => {
  await new Promise(async resolve => {
    let resolved = false

    const server = await newHocuspocus(t, {
      async onChange({ instance }) {
        if (resolved) return
        resolved = true

        t.is(instance, server)

        resolve('done')
      },
    })

    const provider = newHocuspocusProvider(t, server, {
      onSynced() {
        provider.document.getArray('foo').insert(0, ['bar'])
      },
    })
  })
})

test('onChange callback isn\'t called for every new client', async t => {
  let onConnectCount = 0
  let onChangeCount = 0

  await new Promise(async resolve => {
    const server = await newHocuspocus(t, {
      async onConnect() {
        onConnectCount += 1
      },
      async onChange() {
        onChangeCount += 1
      },
    })

    newHocuspocusProvider(t, server)
    newHocuspocusProvider(t, server)

    resolve('done')
  })

  await retryableAssertion(t, tt => {
    tt.is(onConnectCount, 2)
    tt.is(onChangeCount, 0)
  })

})

test('onChange works properly for changes from direct connections', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus(t, {
      name: 'hocuspocus-test',
      async onChange(data) {
        resolve('')
        t.pass()
      },
    })

    const conn = await server.openDirectConnection('hocuspocus-test')
    t.is(server.getConnectionsCount(), 1)

    conn.transact(doc => {
      doc.getMap('t').set('g', 'b')
    })
  })
})
