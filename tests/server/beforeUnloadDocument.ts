import { describe, expect, test } from 'vite-plus/test'
import { pass } from '../utils/index.ts'

import type { HocuspocusProvider } from '@hocuspocus/provider'

import { newHocuspocus, newHocuspocusProvider } from '../utils/index.ts'

describe('beforeUnloadDocument', () => {
  test('executes the beforeUnloadDocument callback', async t => {
    await new Promise(async resolve => {
      const server = await newHocuspocus({
        async beforeUnloadDocument() {
          pass()
          resolve('done')
        },
      })

      const p = newHocuspocusProvider(server, {
        onSynced(data) {
          p.destroy()
        },
      })
    })
  })

  test('executes the beforeUnloadDocument callback when all clients disconnect after a document was loaded', async t => {
    await new Promise(async resolve => {
      // eslint-disable-next-line prefer-const
      let provider: HocuspocusProvider

      class CustomExtension {
        async afterLoadDocument() {
          provider.destroy()
        }

        async beforeUnloadDocument() {
          pass()
          resolve('done')
        }
      }

      const server = await newHocuspocus({
        extensions: [new CustomExtension()],
      })

      provider = newHocuspocusProvider(server)
    })
  })

  test('throwing an exception in beforeUnloadDocument prevents a document from being unloaded', async t => {
    await new Promise(async resolve => {
      // eslint-disable-next-line prefer-const
      let provider: HocuspocusProvider

      class CustomExtension {
        async beforeUnloadDocument() {
          throw new Error('my custom error')
        }

        async afterUnloadDocument() {
          expect.fail('should not be called')
        }
      }

      const server = await newHocuspocus({
        extensions: [new CustomExtension()],
      })

      const p = newHocuspocusProvider(server, {
        onSynced(data) {
          p.destroy()
        },
      })

      setTimeout(() => {
        expect(server.documents.size).toBe(1)
        pass()
        resolve('done')
      }, 500)
    })
  })
})
