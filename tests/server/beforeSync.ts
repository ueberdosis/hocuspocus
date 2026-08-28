import { describe, expect, test } from 'vite-plus/test'

import { newHocuspocus, newHocuspocusProvider } from '../utils/index.ts'
import { retryableAssertion } from '../utils/retryableAssertion.ts'

describe('beforeSync', () => {
  test('beforeSync gets called in proper order', async t => {
    await new Promise(async resolve => {
      let resolved = false
      const mockContext = {
        user: 123,
      }

      let callNumber = 0

      const server = await newHocuspocus({
        async onConnect() {
          return mockContext
        },
        async beforeSync({ document, context, payload }) {
          if (resolved) return

          expect(context).toStrictEqual(mockContext)

          callNumber += 1

          if (callNumber === 2) {
            resolved = true
            resolve('done')
          }
        },
        async onChange({ context, document }) {
          if (resolved) return

          expect(context).toStrictEqual(mockContext)

          const value = document.getArray('foo').get(0)

          expect(value).toBe('bar')
        },
      })

      const provider = newHocuspocusProvider(server, {
        onSynced() {
          provider.document.getArray('foo').insert(0, ['bar'])
        },
      })
    })
  })

  test('beforeSync callback is called for every sync', async t => {
    let onConnectCount = 0
    let updateCount = 0
    let syncstep1Count = 0
    let syncstep2Count = 0

    await new Promise(async resolve => {
      const server = await newHocuspocus({
        async onConnect() {
          onConnectCount += 1
        },
        async beforeSync({ type }) {
          if (type === 0) {
            syncstep1Count += 1
          } else if (type === 1) {
            syncstep2Count += 1
          } else if (type === 2) {
            updateCount += 1
          }
        },
      })

      await Promise.all([
        new Promise(done => {
          newHocuspocusProvider(server, {
            onClose() {
              expect.fail()
            },
            onSynced() {
              done('done')
            },
          })
        }),
        new Promise(done => {
          newHocuspocusProvider(server, {
            onClose() {
              expect.fail()
            },
            onSynced() {
              done('done')
            },
          })
        }),
      ])

      resolve('done')
    })

    await retryableAssertion(() => {
      expect(onConnectCount).toBe(2)
      expect(syncstep1Count).toBe(2)
      expect(syncstep2Count).toBe(2)
      expect(updateCount).toBe(0)
    })
  })

  test('beforeSync callback is called on every update', async t => {
    let onConnectCount = 0
    let updateCount = 0
    let syncstep1Count = 0
    let syncstep2Count = 0

    await new Promise(async resolve => {
      const server = await newHocuspocus({
        async onConnect() {
          onConnectCount += 1
        },
        async beforeSync({ type }) {
          if (type === 0) {
            syncstep1Count += 1
          } else if (type === 1) {
            syncstep2Count += 1
          } else if (type === 2) {
            updateCount += 1
          }
        },
      })

      await Promise.all([
        new Promise(done => {
          newHocuspocusProvider(server, {
            onClose() {
              expect.fail()
            },
            onSynced() {
              done('done')
            },
          })
        }),
        new Promise(done => {
          const provider = newHocuspocusProvider(server, {
            onClose() {
              expect.fail()
            },
            onSynced() {
              provider.document.getArray('foo').insert(0, ['bar'])
              done('done')
            },
          })
        }),
      ])

      resolve('done')
    })

    await retryableAssertion(() => {
      expect(onConnectCount).toBe(2)
      expect(syncstep1Count).toBe(2)
      expect(syncstep2Count).toBe(2)
      expect(updateCount).toBe(1)
    })
  })
})
