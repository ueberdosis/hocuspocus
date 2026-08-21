import { describe, expect, test } from 'vite-plus/test'
import { pass } from '../utils/index.ts'

import type { onAuthenticatePayload } from '@hocuspocus/server'
import {
  newHocuspocus,
  newHocuspocusProvider,
  newHocuspocusProviderWebsocket,
} from '../utils/index.ts'

describe('websocketError', () => {
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

      let interval: ReturnType<typeof setInterval>

      const provider = newHocuspocusProvider(server, {
        websocketProvider: socket,
        onClose({ event }) {
          expect(event.code).toBe(4401)
          clearInterval(interval)
          provider.destroy()
        },
        onDestroy() {
          pass()
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
})
