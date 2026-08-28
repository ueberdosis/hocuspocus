import { describe, expect, test } from 'vite-plus/test'
import { pass } from '../utils/index.ts'

import { newHocuspocus, newHocuspocusProvider } from '../utils/index.ts'

describe('onDisconnect', () => {
  test('executes the onDisconnect callback', async t => {
    await new Promise(async resolve => {
      const server = await newHocuspocus({
        async onDisconnect() {
          pass()
          resolve('done')
        },
      })

      const provider = newHocuspocusProvider(server, {
        onConnect() {
          provider.configuration.websocketProvider.disconnect()
          provider.disconnect()
        },
      })
    })
  })

  test('executes the onDisconnect callback from an extension', async t => {
    await new Promise(async resolve => {
      const server = await newHocuspocus()

      class CustomExtension {
        async onDisconnect() {
          pass()
          resolve('done')
        }
      }

      server.configure({
        extensions: [new CustomExtension()],
      })

      const provider = newHocuspocusProvider(server, {
        onConnect() {
          provider.configuration.websocketProvider.disconnect()
          provider.disconnect()
        },
      })
    })
  })

  test('passes the context to the onLoadDocument callback', async t => {
    await new Promise(async resolve => {
      const server = await newHocuspocus()

      const mockContext = {
        user: 123,
      }

      server.configure({
        async onConnect() {
          return mockContext
        },
        async onDisconnect({ context }) {
          expect(context).toStrictEqual(mockContext)

          resolve('done')
        },
      })

      const provider = newHocuspocusProvider(server, {
        onConnect() {
          provider.configuration.websocketProvider.disconnect()
          provider.disconnect()
        },
      })
    })
  })

  test('has the server instance', async t => {
    await new Promise(async resolve => {
      const server = await newHocuspocus({
        async onDisconnect({ instance }) {
          expect(instance).toBe(server)

          resolve('done')
        },
      })

      const provider = newHocuspocusProvider(server, {
        onConnect() {
          provider.configuration.websocketProvider.disconnect()
          provider.disconnect()
        },
      })
    })
  })

  test('the connections count is correct', async t => {
    await new Promise(async resolve => {
      const server = await newHocuspocus({
        async onDisconnect() {
          expect(server.getConnectionsCount()).toBe(0)
          resolve('done')
        },
      })

      const provider = newHocuspocusProvider(server, {
        onConnect() {
          provider.configuration.websocketProvider.disconnect()
          provider.disconnect()
        },
      })
    })
  })
})
