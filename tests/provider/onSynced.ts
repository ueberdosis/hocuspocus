import { describe, expect, test } from 'vite-plus/test'
import { pass } from '../utils/index.ts'

import { newHocuspocus, newHocuspocusProvider, sleep } from '../utils/index.ts'

describe('onSynced', () => {
  test('onSynced callback is executed', async t => {
    await new Promise(async resolve => {
      const server = await newHocuspocus()

      newHocuspocusProvider(server, {
        onSynced() {
          pass()
          resolve('done')
        },
      })
    })
  })

  test("on('synced') callback is executed", async t => {
    await new Promise(async resolve => {
      const server = await newHocuspocus()

      const provider = newHocuspocusProvider(server)

      provider.on('synced', () => {
        pass()
        resolve('done')
      })
    })
  })

  test('onSynced callback is executed, even when the onConnect takes longer', async t => {
    await new Promise(async resolve => {
      const server = await newHocuspocus({
        async onConnect(data) {
          await sleep(100)
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

  test('onSynced callback is executed when the document is actually synced', async t => {
    await new Promise(async resolve => {
      const server = await newHocuspocus({
        async onLoadDocument({ document }) {
          document.getArray('foo').insert(0, ['bar'])

          return document
        },
      })

      const provider = newHocuspocusProvider(server, {
        onSynced() {
          const value = provider.document.getArray('foo').get(0)
          expect(value).toBe('bar')

          resolve('done')
        },
      })
    })
  })

  test('send all messages according to the protocol', async t => {
    await new Promise(async resolve => {
      const server = await newHocuspocus({
        async onLoadDocument({ document }) {
          document.getArray('foo').insert(0, ['bar'])

          return document
        },
      })

      const provider = newHocuspocusProvider(server, {
        async onSynced() {
          expect(provider.document.getArray('foo').get(0)).toStrictEqual('bar')

          resolve('done')
        },
      })
    })
  })

  test('onSynced callback is executed when the document is actually synced, even if it takes longer', async t => {
    await new Promise(async resolve => {
      const server = await newHocuspocus({
        async onLoadDocument({ document }) {
          await sleep(100)

          document.getArray('foo').insert(0, ['bar'])

          return document
        },
      })

      const provider = newHocuspocusProvider(server, {
        onSynced() {
          const value = provider.document.getArray('foo').get(0)
          expect(value).toBe('bar')

          resolve('done')
        },
      })
    })
  })
})
