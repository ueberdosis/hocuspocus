import test from 'ava'
import WebSocket from 'ws'
import { Hocuspocus } from '@hocuspocus/server'
import { HocuspocusProvider } from '@hocuspocus/provider'

test('executes the onConnect callback', async t => {
  await new Promise(resolve => {
    const server = new Hocuspocus()
    server.configure({ port: 4001 }).listen()

    const client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4001',
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
    server.configure({ port: 4002 }).listen()

    const client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4002',
      name: 'hocuspocus-test',
      WebSocketPolyfill: WebSocket,
    })

    client.on('connect', () => {
      resolve('done')
    })
  })

  t.pass()
})

test.failing('doesn’t execute the onConnect callback when the server throws an error', async t => {
  await new Promise(resolve => {
    const server = new Hocuspocus()
    server.configure({
      port: 4003,
      async onConnect() {
        throw new Error()
      },
    }).listen()

    const client = new HocuspocusProvider({
      url: 'ws://127.0.0.1:4003',
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
