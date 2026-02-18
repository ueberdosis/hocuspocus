import test from 'ava'
import type { onAuthenticatePayload } from '@hocuspocus/server'
import { newHocuspocus, newHocuspocusProvider, newHocuspocusProviderWebsocket } from '../utils/index.ts'

test('does not crash when malformed message is sent pre-authentication', async t => {
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