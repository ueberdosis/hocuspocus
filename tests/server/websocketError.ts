import test from 'ava'
import { onAuthenticatePayload } from '@hocuspocus/server'
import { newHocuspocus, newHocuspocusProvider, newHocuspocusProviderWebsocket } from '../utils/index.js'

test('does not crash when invalid opcode is sent', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus()

    const socket = newHocuspocusProviderWebsocket(server)

    const provider = newHocuspocusProvider(server, {
      websocketProvider: socket,
      onSynced({ state }) {
        // Send a bad opcode via the low level internal _socket
        // Inspired by https://github.com/websockets/ws/blob/975382178f8a9355a5a564bb29cb1566889da9ba/test/websocket.test.js#L553-L589

        if (state) {
        // @ts-ignore
          socket.webSocket!._socket.write(Buffer.from([0x00, 0x00])) // eslint-disable-line
        }
      },
      onClose({ event }) {
        t.is(event.code, 1002)
        socket.destroy()
      },
      onDestroy() {
        t.pass()
        resolve(true)
      },
    })
  })
})

test('does not crash when invalid utf-8 sequence is sent pre-authentication', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus({
      async onAuthenticate(data: onAuthenticatePayload) {
        return new Promise(async resolve => {
          setTimeout(resolve, 2000)
        })
      },
    })

    const socket = newHocuspocusProviderWebsocket(server)

    const provider = newHocuspocusProvider(server, {
      websocketProvider: socket,
      onClose({ event }) {
        t.is(event.code, 4401)
        provider.destroy()
      },
      onDestroy() {
        t.pass()
        resolve(true)
      },
    })

    setInterval(() => {
      socket.webSocket!.send('ϩ') // eslint-disable-line
    }, 500)
  })
})

test('does not crash when invalid utf-8 sequence is sent post-authentication', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus({
      async onAuthenticate(data: onAuthenticatePayload) {
        return new Promise(async resolve => {
          setTimeout(resolve, 2000)
        })
      },
    })

    const socket = newHocuspocusProviderWebsocket(server)

    const provider = newHocuspocusProvider(server, {
      websocketProvider: socket,
      token: 'test123',
      onClose({ event }) {
        t.is(event.code, 1002)
        provider.destroy()
      },
      onDestroy() {
        t.pass()
        resolve(true)
      },
    })

    setInterval(() => {
      // @ts-ignore
      socket.webSocket!._socket.write(Buffer.from([0x81, 0x04, 0xce, 0xba, 0xe1, 0xbd])) // eslint-disable-line
    }, 500)

  })
})
