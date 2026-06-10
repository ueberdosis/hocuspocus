import test from 'ava'
import type { onAuthenticatePayload } from '@hocuspocus/server'
import { newHocuspocus, newHocuspocusProvider, newHocuspocusProviderWebsocket } from '../utils/index.ts'

test('does not crash when malformed message is sent pre-authentication', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus(t, {
      async onAuthenticate(data: onAuthenticatePayload) {
        return new Promise(async resolve => {
          setTimeout(resolve, 2000)
        })
      },
    })

    const socket = newHocuspocusProviderWebsocket(t, server)

    let interval: ReturnType<typeof setInterval>

    const provider = newHocuspocusProvider(t, server, {
      websocketProvider: socket,
      onClose({ event }) {
        t.is(event.code, 4401)
        clearInterval(interval)
        provider.destroy()
      },
      onDestroy() {
        t.pass()
        resolve(true)
      },
    })

    interval = setInterval(() => {
      if (socket.webSocket) {
        socket.webSocket.send('ϩ') // eslint-disable-line
      }
    }, 500)
  })
})