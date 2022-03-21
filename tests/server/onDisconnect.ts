import test from 'ava'
import { newHocuspocus, newHocuspocusProvider } from '../utils'

test('executes the onDisconnect callback', async t => {
  await new Promise(resolve => {
    const server = newHocuspocus({
      async onDisconnect() {
        t.pass()
        resolve('done')
      },
    })

    const provider = newHocuspocusProvider(server, {
      onConnect() {
        provider.disconnect()
      },
    })
  })
})

test('executes the onDisconnect callback from an extension', async t => {
  await new Promise(resolve => {
    const server = newHocuspocus()

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

    const provider = newHocuspocusProvider(server, {

      onConnect() {
        provider.disconnect()
      },
    })
  })
})

test('passes the context to the onLoadDocument callback', async t => {
  await new Promise(resolve => {
    const server = newHocuspocus()

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

    const provider = newHocuspocusProvider(server, {

      onConnect() {
        provider.disconnect()
      },
    })
  })
})

test('has the server instance', async t => {
  await new Promise(resolve => {
    const server = newHocuspocus({
      async onDisconnect({ instance }) {
        t.is(instance, server)

        resolve('done')
      },
    })

    const provider = newHocuspocusProvider(server, {

      onConnect() {
        provider.disconnect()
      },
    })
  })
})

test('the connections count is correct', async t => {
  await new Promise(resolve => {
    const server = newHocuspocus({
      async onDisconnect() {
        t.is(server.getConnectionsCount(), 0)
        resolve('done')
      },
    })

    const provider = newHocuspocusProvider(server, {
      onConnect() {
        provider.disconnect()
      },
    })
  })
})
