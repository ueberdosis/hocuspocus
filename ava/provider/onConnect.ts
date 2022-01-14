import test from 'ava'
import WebSocket, { AddressInfo } from 'ws'
import { Hocuspocus } from '@hocuspocus/server'
import { HocuspocusProvider } from '@hocuspocus/provider'

test('executes the onConnect callback', async t => {
  await new Promise(resolve => {
    const server = new Hocuspocus()
    server.configure({ quiet: true, port: 0 }).listen()
    const { port } = server.address

    const client = new HocuspocusProvider({
      url: `ws://127.0.0.1:${port}`,
      name: 'hocuspocus-test',
      WebSocketPolyfill: WebSocket,
      onConnect: () => {
        resolve('done')
      },
    })
  })

  t.pass()
})

test("executes the on('connect') callback", async t => {
  await new Promise(resolve => {
    const server = new Hocuspocus()
    server.configure({ quiet: true, port: 0 }).listen()
    const { port } = server.address

    const client = new HocuspocusProvider({
      url: `ws://127.0.0.1:${port}`,
      name: 'hocuspocus-test',
      WebSocketPolyfill: WebSocket,
    })

    client.on('connect', () => {
      resolve('done')
    })
  })

  t.pass()
})

test.skip('doesn’t execute the onConnect callback when the server throws an error', async t => {
  await new Promise(resolve => {
    const server = new Hocuspocus()
    server.configure({
      quiet: true,
      port: 4000,
      async onConnect() {
        throw new Error()
      },
    }).listen()
    const { port } = server.address

    const client = new HocuspocusProvider({
      url: `ws://127.0.0.1:${port}`,
      name: 'hocuspocus-test',
      WebSocketPolyfill: WebSocket,
      onConnect: () => {
        t.fail('onConnect must not be executed')
      },
      onClose: () => {
        resolve('done')
      },
    })
  })

  t.pass()
})
