import { describe, expect, test } from 'vite-plus/test'
import { pass } from '../utils/index.ts'

import type { Hocuspocus } from '@hocuspocus/server'
import { newHocuspocus, newHocuspocusProvider } from '../utils/index.ts'

describe('onConfigure', () => {
  test('onConfigure callback is executed', async t => {
    await new Promise(async resolve => {
      let givenInstance = null

      const server = await newHocuspocus({
        async onConfigure({ instance }) {
          givenInstance = instance
        },
      })

      expect(givenInstance as unknown as Hocuspocus).toBe(server)
      resolve('done')
    })
  })

  test('executes onConfigure callback from an extension', async t => {
    await new Promise(async resolve => {
      class CustomExtension {
        async onConfigure() {
          pass()
          resolve('done')
        }
      }

      const server = await newHocuspocus({
        extensions: [new CustomExtension()],
      })

      newHocuspocusProvider(server)
    })
  })

  test('has the configuration', async t => {
    await new Promise(async resolve => {
      newHocuspocus({
        debounce: 2001,
        async onConfigure({ configuration }) {
          expect(configuration.debounce).toBe(2001)

          resolve('done')
        },
      })
    })
  })

  test('has the version', async t => {
    await new Promise(async resolve => {
      newHocuspocus({
        async onConfigure({ version }) {
          expect(version).toBeTruthy()

          resolve('done')
        },
      })
    })
  })
})
