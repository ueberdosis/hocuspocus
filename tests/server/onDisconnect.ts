import test from 'ava'
import { newHocuspocus, newHocuspocusProvider, sleep } from '../utils/index.ts'

test('executes the onDisconnect callback', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus(t, {
      async onDisconnect() {
        t.pass()
        resolve('done')
      },
    })

    const provider = newHocuspocusProvider(t, server, {
      onConnect() {
        provider.configuration.websocketProvider.disconnect()
        provider.disconnect()
      },
    })
  })
})

test('executes the onDisconnect callback from an extension', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus(t)

    class CustomExtension {
      async onDisconnect() {
        t.pass()
        resolve('done')
      }
    }

    server.configure({
      extensions: [
        new CustomExtension(),
      ],
    })

    const provider = newHocuspocusProvider(t, server, {

      onConnect() {
        provider.configuration.websocketProvider.disconnect()
        provider.disconnect()
      },
    })
  })
})

test('passes the context to the onLoadDocument callback', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus(t)

    const mockContext = {
      user: 123,
    }

    server.configure({
      async onConnect() {
        return mockContext
      },
      async onDisconnect({ context }) {
        t.deepEqual(context, mockContext)

        resolve('done')
      },
    })

    const provider = newHocuspocusProvider(t, server, {

      onConnect() {
        provider.configuration.websocketProvider.disconnect()
        provider.disconnect()
      },
    })
  })
})

test('has the server instance', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus(t, {
      async onDisconnect({ instance }) {
        t.is(instance, server)

        resolve('done')
      },
    })

    const provider = newHocuspocusProvider(t, server, {

      onConnect() {
        provider.configuration.websocketProvider.disconnect()
        provider.disconnect()
      },
    })
  })
})

test('the connections count is correct', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus(t, {
      async onDisconnect() {
        t.is(server.getConnectionsCount(), 0)
        resolve('done')
      },
    })

    const provider = newHocuspocusProvider(t, server, {
      onConnect() {
        provider.configuration.websocketProvider.disconnect()
        provider.disconnect()
      },
    })
  })
})

test('runs onDisconnect only once when a client disconnects with awareness set and flushDelay is false', async t => {
  // Regression test for #1199: removing the connection while its awareness
  // states broadcast immediately (flushDelay: false) used to reach the
  // still-registered closing connection, whose `send` then called `close()`
  // again and fired `onDisconnect` a second time.
  const calls: number[] = []

  const server = await newHocuspocus(t, {
    flushDelay: false,
    async onDisconnect() {
      calls.push(1)
    },
  })

  const provider = newHocuspocusProvider(t, server)

  await new Promise(resolve => provider.on('synced', resolve))

  provider.setAwarenessField('user', { name: 'a' })
  // Give the server a moment to apply the awareness update.
  await sleep(100)

  provider.configuration.websocketProvider.disconnect()
  // Keep waiting longer than the whole close sequence so a second
  // onDisconnect call would be caught.
  await sleep(300)

  t.is(calls.length, 1)
})
