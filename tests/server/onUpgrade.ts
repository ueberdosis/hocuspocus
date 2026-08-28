import { describe, expect, test } from 'vite-plus/test'
import { pass } from '../utils/index.ts'

import { newHocuspocus, newHocuspocusProvider } from '../utils/index.ts'

describe('onUpgrade', () => {
  test('executes the onUpgrade callback', async t => {
    await new Promise(async resolve => {
      const server = await newHocuspocus({
        async onUpgrade() {
          pass()
          resolve('done')
        },
      })

      newHocuspocusProvider(server)
    })
  })

  test('executes the onUpgrade callback from an extension', async t => {
    await new Promise(async resolve => {
      class CustomExtension {
        async onUpgrade() {
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

  test('has the server instance', async t => {
    await new Promise(async resolve => {
      const server = await newHocuspocus({
        async onUpgrade({ instance }) {
          expect(instance).toBe(server)
          resolve('done')
        },
      })

      newHocuspocusProvider(server)
    })
  })

  test('has the request', async t => {
    await new Promise(async resolve => {
      const server = await newHocuspocus({
        async onUpgrade({ request }) {
          expect(request.url).toBe('/')
          resolve('done')
        },
      })

      newHocuspocusProvider(server)
    })
  })

  test('has the socket', async t => {
    await new Promise(async resolve => {
      const server = await newHocuspocus({
        async onUpgrade({ socket }) {
          expect(socket).toBeTruthy()
          resolve('done')
        },
      })

      newHocuspocusProvider(server)
    })
  })

  test('has the head', async t => {
    await new Promise(async resolve => {
      const server = await newHocuspocus({
        async onUpgrade({ head }) {
          expect(head).toBeTruthy()
          resolve('done')
        },
      })

      newHocuspocusProvider(server)
    })
  })
})
