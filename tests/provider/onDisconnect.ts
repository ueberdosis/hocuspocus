import { describe, test } from 'vite-plus/test'
import { pass } from '../utils/index.ts'

import { newHocuspocus, newHocuspocusProvider } from '../utils/index.ts'

describe('onDisconnect', () => {
  test('onDisconnect callback is executed', async t => {
    await new Promise(async resolve => {
      const server = await newHocuspocus()

      const provider = newHocuspocusProvider(server, {
        onConnect() {
          provider.configuration.websocketProvider.disconnect()
          provider.disconnect()
        },
        onDisconnect() {
          pass()
          resolve('done')
        },
      })
    })
  })

  test("on('disconnect') callback is executed", async t => {
    await new Promise(async resolve => {
      const server = await newHocuspocus()

      const provider = newHocuspocusProvider(server)

      provider.on('connect', () => {
        provider.configuration.websocketProvider.disconnect()
        provider.disconnect()
      })
      provider.on('disconnect', () => {
        pass()
        resolve('done')
      })
    })
  })
})
