import { describe, expect, test } from 'vite-plus/test'
import { pass } from '../utils/index.ts'

import { newHocuspocus, newHocuspocusProvider } from '../utils/index.ts'
import { retryableAssertion } from '../utils/retryableAssertion.ts'

describe('afterHandleMessage', () => {
  test('afterHandleMessage is called after the update has been applied', async t => {
    await new Promise(async resolve => {
      const server = await newHocuspocus({
        async afterHandleMessage({ document }) {
          // contrary to beforeHandleMessage, the update is already applied here
          if (document.getArray('foo').get(0) === 'bar') {
            pass()
            resolve('done')
          }
        },
      })

      const provider = newHocuspocusProvider(server, {
        onSynced() {
          provider.document.getArray('foo').insert(0, ['bar'])
        },
      })
    })
  })

  test('afterHandleMessage is called once per handled message', async t => {
    let beforeHandleMessageCount = 0
    let afterHandleMessageCount = 0

    await new Promise(async resolve => {
      const server = await newHocuspocus({
        async beforeHandleMessage() {
          beforeHandleMessageCount += 1
        },
        async afterHandleMessage() {
          afterHandleMessageCount += 1
        },
      })

      newHocuspocusProvider(server, {
        onClose() {
          expect.fail()
        },
      })
      newHocuspocusProvider(server, {
        onClose() {
          expect.fail()
        },
      })

      resolve('done')
    })

    await retryableAssertion(() => {
      expect(afterHandleMessageCount > 0).toBe(true)
      expect(afterHandleMessageCount).toBe(beforeHandleMessageCount)
    })
  })

  test('afterHandleMessage is not called when beforeHandleMessage rejects', async t => {
    let afterHandleMessageCount = 0

    await new Promise(async resolve => {
      const server = await newHocuspocus({
        async beforeHandleMessage() {
          throw new Error()
        },
        async afterHandleMessage() {
          afterHandleMessageCount += 1
        },
      })

      newHocuspocusProvider(server, {
        onClose() {
          resolve('done')
        },
      })
    })

    await retryableAssertion(() => {
      expect(afterHandleMessageCount).toBe(0)
    })
  })

  test('an exception thrown in afterHandleMessage does not close the connection', async t => {
    await new Promise(async resolve => {
      const server = await newHocuspocus({
        async afterHandleMessage() {
          throw new Error()
        },
      })

      const provider = newHocuspocusProvider(server, {
        onClose() {
          expect.fail()
        },
        onSynced() {
          pass()
          setTimeout(() => resolve('done'), 100)
        },
      })
    })
  })
})
