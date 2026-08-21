import { describe, expect, test } from 'vite-plus/test'
import { pass } from '../utils/index.ts'

import type { onChangePayload } from '@hocuspocus/server'
import { newHocuspocus, newHocuspocusProvider } from '../utils/index.ts'
import { retryableAssertion } from '../utils/retryableAssertion.ts'

describe('onChange', () => {
  test('onChange callback receives updates', async t => {
    await new Promise(async resolve => {
      let resolved = false
      const mockContext = {
        user: 123,
      }

      const server = await newHocuspocus({
        async onConnect() {
          return mockContext
        },
        async onChange({ document, context }) {
          if (resolved) return
          resolved = true

          expect(context).toStrictEqual(mockContext)

          const value = document.getArray('foo').get(0)
          expect(value).toBe('bar')

          resolve('done')
        },
      })

      const provider = newHocuspocusProvider(server, {
        onSynced() {
          provider.document.getArray('foo').insert(0, ['bar'])
        },
      })
    })
  })

  test('executes onChange callback from an extension', async t => {
    await new Promise(async resolve => {
      let resolved = false

      class CustomExtension {
        async onChange({ document }: onChangePayload) {
          if (resolved) return
          resolved = true

          const value = document.getArray('foo').get(0)

          expect(value).toBe('bar')

          resolve('done')
        }
      }

      const server = await newHocuspocus({
        extensions: [new CustomExtension()],
      })

      const provider = newHocuspocusProvider(server, {
        onSynced() {
          provider.document.getArray('foo').insert(0, ['bar'])
        },
      })
    })
  })

  test('onChange callback is not called after onLoadDocument', async t => {
    await new Promise(async resolve => {
      const server = await newHocuspocus({
        async onChange(data) {
          expect.fail()
        },
        async onLoadDocument({ document }) {
          document.getArray('foo').insert(0, ['bar'])

          return document
        },
      })

      newHocuspocusProvider(server, {
        onSynced() {
          pass()
          resolve('done')
        },
      })
    })
  })

  test('has the server instance', async t => {
    await new Promise(async resolve => {
      let resolved = false

      const server = await newHocuspocus({
        async onChange({ instance }) {
          if (resolved) return
          resolved = true

          expect(instance).toBe(server)

          resolve('done')
        },
      })

      const provider = newHocuspocusProvider(server, {
        onSynced() {
          provider.document.getArray('foo').insert(0, ['bar'])
        },
      })
    })
  })

  test("onChange callback isn't called for every new client", async t => {
    let onConnectCount = 0
    let onChangeCount = 0

    await new Promise(async resolve => {
      const server = await newHocuspocus({
        async onConnect() {
          onConnectCount += 1
        },
        async onChange() {
          onChangeCount += 1
        },
      })

      newHocuspocusProvider(server)
      newHocuspocusProvider(server)

      resolve('done')
    })

    await retryableAssertion(() => {
      expect(onConnectCount).toBe(2)
      expect(onChangeCount).toBe(0)
    })
  })

  test('onChange works properly for changes from direct connections', async t => {
    await new Promise(async resolve => {
      const server = await newHocuspocus({
        name: 'hocuspocus-test',
        async onChange(data) {
          resolve('')
          pass()
        },
      })

      const conn = await server.openDirectConnection('hocuspocus-test')
      expect(server.getConnectionsCount()).toBe(1)

      conn.transact(doc => {
        doc.getMap('t').set('g', 'b')
      })
    })
  })
})
