import { describe, test } from 'vite-plus/test'
import { pass } from '../utils/index.ts'

import { newHocuspocus, newHocuspocusProvider } from '../utils/index.ts'

describe('onMessage', () => {
  test('executes the onMessage callback', async t => {
    await new Promise(async resolve => {
      const server = await newHocuspocus({})

      newHocuspocusProvider(server, {
        onMessage() {
          pass()
          resolve('done')
        },
      })
    })
  })

  test("executes the on('message') callback", async t => {
    await new Promise(async resolve => {
      const server = await newHocuspocus()

      const provider = newHocuspocusProvider(server)

      provider.on('message', () => {
        pass()
        resolve('done')
      })
    })
  })
})
