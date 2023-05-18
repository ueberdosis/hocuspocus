import test from 'ava'
import { onStatelessPayload } from '@hocuspocus/server'
import { newHocuspocus, newHocuspocusProvider } from '../utils/index.js'

test('broadcast stateless message to all connections', async t => {
  await new Promise(async resolve => {
    const payloadToSend = 'STATELESS-MESSAGE'
    const server = await newHocuspocus({
      onStateless: async ({ document }) => {
        await document.broadcastStateless(payloadToSend)
      },
    })

    let count = 2
    const onStatelessCallback = (payload: string) => {
      t.is(payload, payloadToSend)
      count -= 1
      if (count === 0) {
        t.pass()
        resolve('done')
      }
    }

    newHocuspocusProvider(server, { onStateless: ({ payload }) => onStatelessCallback(payload) })
    const provider = newHocuspocusProvider(server, {
      onStateless: ({ payload }) => onStatelessCallback(payload),
      onSynced: () => {
        provider.sendStateless(payloadToSend)
      },
    })
  })
})

test('send a stateless message to a specific connection', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus({
      onStateless: async ({ connection }: onStatelessPayload) => {
        connection.sendStateless('This is a specific message.')
      },
    })

    await newHocuspocusProvider(server, {
      onStateless: async () => {
        throw Error('The provider1 should not receive messages')
      },
    })

    const provider = await newHocuspocusProvider(server, {
      onSynced: () => {
        provider.sendStateless('Send stateless message, and then a stateless message is will be received')
      },
      onStateless: () => {
        t.pass()
        resolve('done')
      },
    })
  })
})

test('calls the onStateless hook', async t => {
  await new Promise(async resolve => {
    const payloadToSend = 'STATELESS-MESSAGE'
    class CustomExtension {
      async onStateless({ payload }: onStatelessPayload) {
        t.is(payload, payloadToSend)
        t.pass()
        resolve('done')
      }
    }

    const server = await newHocuspocus({
      extensions: [
        new CustomExtension(),
      ],
    })

    const provider = await newHocuspocusProvider(server, {
      onSynced: async () => {
        provider.sendStateless(payloadToSend)
      },
    })
  })
})

test('the server actively sends a stateless message', async t => {
  const payloadToSend = 'STATELESS-MESSAGE'
  const server = await newHocuspocus()

  await new Promise(resolve => {
    newHocuspocusProvider(server, {
      onSynced: async () => {
        server.documents.get('hocuspocus-test')?.broadcastStateless(payloadToSend)
      },
      onStateless: async ({ payload }) => {
        t.is(payload, payloadToSend)
        t.pass()
        resolve('done')
      },
    })
  })
})
