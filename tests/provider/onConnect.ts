import { describe, test } from 'vite-plus/test'
import { pass } from '../utils/index.ts'

import { newHocuspocus, newHocuspocusProvider } from '../utils/index.ts'

describe('onConnect', () => {
  test('executes the onConnect callback', async t => {
    await new Promise(async resolve => {
      const server = await newHocuspocus()

      newHocuspocusProvider(server, {
        onConnect() {
          pass()
          resolve('done')
        },
      })
    })
  })

  test("executes the on('connect') callback", async t => {
    await new Promise(async resolve => {
      const server = await newHocuspocus()

      const provider = newHocuspocusProvider(server)

      provider.on('connect', () => {
        pass()
        resolve('done')
      })
    })
  })
})
