import test from 'ava'
import type { onAuthenticatePayload } from '@hocuspocus/server'
import { newHocuspocus, newHocuspocusProvider, newHocuspocusProviderWebsocket } from '../utils/index.ts'

test('does not crash when invalid opcode is sent', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus()

    const socket = newHocuspocusProviderWebsocket(server)

    const provider = newHocuspocusProvider(server, {
      websocketProvider: socket,
      onSynced({ state }) {
        socket.shouldConnect = false

        // Send a bad opcode via the low level internal _socket
        // Inspired by https://github.com/websockets/ws/blob/975382178f8a9355a5a564bb29cb1566889da9ba/test/websocket.test.js#L553-L589
        // Note: _socket is only available with the `ws` library, not native WebSocket

        if (state) {
          // @ts-ignore
          const internalSocket = socket.webSocket?._socket
          if (internalSocket) {
            internalSocket.write(Buffer.from([0x00, 0x00]))
          } else {
            // Native WebSocket doesn't expose _socket, skip the low-level test
            socket.destroy()
          }
        }
      },
      onClose({ event }) {
        // @ts-ignore - _socket only exists on ws library
        if (socket.webSocket?._socket) {
          t.is(event.code, 1002)
        }
        try {
          socket.destroy()
          // eslint-disable-next-line no-empty
        } catch (e) {

        }
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

    // @ts-ignore - _socket only exists on ws library
    const hasInternalSocket = () => socket.webSocket?._socket

    const provider = newHocuspocusProvider(server, {
      websocketProvider: socket,
      token: 'test123',
      onClose({ event }) {
        if (hasInternalSocket()) {
          t.is(event.code, 1002)
        }
        provider.destroy()
      },
      onDestroy() {
        t.pass()
        resolve(true)
      },
    })

    // Native WebSocket doesn't expose _socket, skip the low-level test
    if (!hasInternalSocket()) {
      // Wait a bit for socket to be established, then check again
      setTimeout(() => {
        if (!hasInternalSocket()) {
          provider.destroy()
          return
        }
      }, 100)
    }

    const interval = setInterval(() => {
      // @ts-ignore
      const internalSocket = socket.webSocket?._socket
      if (internalSocket) {
        internalSocket.write(Buffer.from([0x81, 0x04, 0xce, 0xba, 0xe1, 0xbd]))
      } else {
        clearInterval(interval)
        provider.destroy()
      }
    }, 500)

  })
})
