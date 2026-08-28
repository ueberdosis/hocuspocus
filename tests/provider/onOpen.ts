import { describe, test } from 'vite-plus/test'
import { pass } from '../utils/index.ts'

import { newHocuspocus, newHocuspocusProvider } from '../utils/index.ts'

describe('onOpen', () => {
  test('onOpen callback is executed', async t => {
    await new Promise(async resolve => {
      const server = await newHocuspocus()

      newHocuspocusProvider(server, {
        onOpen() {
          pass()
          resolve('done')
        },
      })
    })
  })

  test("on('open') callback is executed", async t => {
    await new Promise(async resolve => {
      const server = await newHocuspocus()

      const provider = newHocuspocusProvider(server)

      provider.on('open', () => {
        pass()
        resolve('done')
      })
    })
  })
})
