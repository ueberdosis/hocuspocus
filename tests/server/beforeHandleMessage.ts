import { describe, expect, test } from 'vite-plus/test'
import { pass } from '../utils/index.ts'

import { newHocuspocus, newHocuspocusProvider } from '../utils/index.ts'
import { retryableAssertion } from '../utils/retryableAssertion.ts'

describe('beforeHandleMessage', () => {
  test('beforeHandleMessage gets called in proper order', async t => {
    await new Promise(async resolve => {
      const mockContext = {
        user: 123,
      }

      const expectedValuesByCallNumber = [
        undefined, // syncstep1
        undefined, // syncstep2
        'foo', // sync finished, value should be there now
      ]
      let callNumber = 0

      const server = await newHocuspocus({
        async onConnect() {
          return mockContext
        },
        async beforeHandleMessage({ document, context }) {
          expect(context).toStrictEqual(mockContext)

          const value = document.getArray('foo').get(0)

          expect(value).toBe(expectedValuesByCallNumber[callNumber])
          callNumber += 1

          if (callNumber === expectedValuesByCallNumber.length - 1) {
            resolve('done')
          }
        },
        async onChange({ context, document }) {
          expect(context).toStrictEqual(mockContext)

          const value = document.getArray('foo').get(0)

          expect(value).toBe(expectedValuesByCallNumber[2])
        },
      })

      const provider = newHocuspocusProvider(server, {
        onSynced() {
          provider.document.getArray('foo').insert(0, ['bar'])
        },
      })
    })
  })

  test('beforeHandleMessage callback is called for every new client', async t => {
    let onConnectCount = 0
    let beforeHandleMessageCount = 0

    await new Promise(async resolve => {
      const server = await newHocuspocus({
        async onConnect() {
          onConnectCount += 1
        },
        async beforeHandleMessage() {
          beforeHandleMessageCount += 1
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
      expect(onConnectCount).toBe(2)
      expect(beforeHandleMessageCount).toBe(6) // 2x awareness per conn, 2x sync per conn (step 1 + 2)
    })
  })

  test('an exception thrown in beforeHandleMessage closes the connection and discards queued messages', async t => {
    let beforeHandleMessageCount = 0

    await new Promise(async resolve => {
      const server = await newHocuspocus({
        async beforeHandleMessage({ connection, update }) {
          beforeHandleMessageCount += 1

          if (beforeHandleMessageCount === 1) {
            connection.handleMessage(update)
          }

          throw new Error()
        },
      })

      newHocuspocusProvider(server, {
        onClose() {
          pass()
          resolve('done')
        },
      })
    })

    expect(beforeHandleMessageCount).toBe(1)
  })
})
