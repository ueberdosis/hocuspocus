import test from 'ava'
import type { onCommandPayload } from '@hocuspocus/server'
import { newHocuspocus, newHocuspocusProvider } from '../utils/index.ts'

test('broadcast command to all connections', async t => {
  await new Promise(async resolve => {
    const commandType = 'test-command'
    const commandPayload = { message: 'hello' }
    const server = await newHocuspocus({
      onCommand: async ({ document, type, payload }) => {
        await document.broadcastCommand(type, payload)
      },
    })

    let count = 2
    const onCommandCallback = (type: string, payload: any) => {
      t.is(type, commandType)
      t.deepEqual(payload, commandPayload)
      count -= 1
      if (count === 0) {
        t.pass()
        resolve('done')
      }
    }

    newHocuspocusProvider(server, { onCommand: ({ type, payload }) => onCommandCallback(type, payload) })
    const provider = newHocuspocusProvider(server, {
      onCommand: ({ type, payload }) => onCommandCallback(type, payload),
      onSynced: () => {
        provider.sendCommand(commandType, commandPayload)
      },
    })
  })
})

test('broadcast event to all connections', async t => {
  await new Promise(async resolve => {
    const eventType = 'test-event'
    const eventPayload = { id: '123', text: 'world' }
    const server = await newHocuspocus({
      onCommand: async ({ document }) => {
        document.broadcastEvent(eventType, eventPayload)
      },
    })

    let count = 2
    const onEventCallback = (type: string, payload: any) => {
      t.is(type, eventType)
      t.deepEqual(payload, eventPayload)
      count -= 1
      if (count === 0) {
        t.pass()
        resolve('done')
      }
    }

    newHocuspocusProvider(server, { onEvent: ({ type, payload }) => onEventCallback(type, payload) })
    const provider = newHocuspocusProvider(server, {
      onEvent: ({ type, payload }) => onEventCallback(type, payload),
      onSynced: () => {
        provider.sendCommand('trigger', {})
      },
    })
  })
})

test('send a command to a specific connection', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus({
      onCommand: async ({ connection }: onCommandPayload) => {
        connection.sendEvent('response', { text: 'specific message' })
      },
    })

    await newHocuspocusProvider(server, {
      onEvent: async () => {
        throw Error('The provider1 should not receive messages')
      },
    })

    const provider = await newHocuspocusProvider(server, {
      onSynced: () => {
        provider.sendCommand('request', { data: 'test' })
      },
      onEvent: () => {
        t.pass()
        resolve('done')
      },
    })
  })
})

test('calls the onCommand hook', async t => {
  await new Promise(async resolve => {
    const commandType = 'test-command'
    const commandPayload = { key: 'value' }
    class CustomExtension {
      async onCommand({ type, payload }: onCommandPayload) {
        t.is(type, commandType)
        t.deepEqual(payload, commandPayload)
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
        provider.sendCommand(commandType, commandPayload)
      },
    })
  })
})

test('the server actively sends an event', async t => {
  const eventType = 'server-event'
  const eventPayload = { data: 'from-server' }
  const server = await newHocuspocus()

  await new Promise(resolve => {
    newHocuspocusProvider(server, {
      onSynced: async () => {
        server.documents.get('hocuspocus-test')?.broadcastEvent(eventType, eventPayload)
      },
      onEvent: async ({ type, payload }) => {
        t.is(type, eventType)
        t.deepEqual(payload, eventPayload)
        t.pass()
        resolve('done')
      },
    })
  })
})
