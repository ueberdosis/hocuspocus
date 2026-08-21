import { describe, test } from 'vite-plus/test'
import { pass } from '../utils/index.ts'

import { newHocuspocus, newHocuspocusProvider } from '../utils/index.ts'

describe('onClose', () => {
  test('onClose callback is executed', async t => {
    await new Promise(async resolve => {
      const server = await newHocuspocus()

      const provider = newHocuspocusProvider(server, {
        onConnect() {
          provider.configuration.websocketProvider.disconnect()
        },
        onClose() {
          pass()
          resolve('done')
        },
      })
    })
  })

  test("on('close') callback is executed", async t => {
    await new Promise(async resolve => {
      const server = await newHocuspocus()

      const provider = newHocuspocusProvider(server)

      provider.on('connect', () => {
        provider.configuration.websocketProvider.disconnect()
      })

      provider.on('close', () => {
        pass()
        resolve('done')
      })
    })
  })
})
