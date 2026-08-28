import { describe, expect, test } from 'vite-plus/test'
import { pass } from '../utils/index.ts'

import { newHocuspocus } from '../utils/index.ts'

describe('onListen', () => {
  test('executes the onListen callback', async t => {
    await new Promise(async resolve => {
      newHocuspocus({
        async onListen() {
          pass()
          resolve('done')
        },
      })
    })
  })

  test('executes the onListen callback from an extension', async t => {
    await new Promise(async resolve => {
      class CustomExtension {
        async onListen() {
          pass()
          resolve('done')
        }
      }

      newHocuspocus({
        extensions: [new CustomExtension()],
      })
    })
  })

  test('has the configuration', async t => {
    await new Promise(async resolve => {
      newHocuspocus({
        async onListen({ configuration }) {
          expect(configuration.quiet).toBe(true)
          resolve('done')
        },
      })
    })
  })

  test('has the port', async t => {
    await new Promise(async resolve => {
      newHocuspocus({
        async onListen({ port }) {
          expect(port).toBeTruthy()
          resolve('done')
        },
      })
    })
  })
})
