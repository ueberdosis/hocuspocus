import test from 'ava'
import { newHocuspocus, newHocuspocusProvider } from '../utils/index.js'
import { retryableAssertion } from '../utils/retryableAssertion.js'

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
        t.deepEqual(context, mockContext)

        const value = document.getArray('foo').get(0)

        t.is(value, expectedValuesByCallNumber[callNumber])
        callNumber += 1

        if (callNumber === expectedValuesByCallNumber.length - 1) {
          resolve('done')
        }
      },
      async onChange({ context, document }) {
        t.deepEqual(context, mockContext)

        const value = document.getArray('foo').get(0)

        t.is(value, expectedValuesByCallNumber[2])
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
        t.fail()
      },
    })
    newHocuspocusProvider(server, {
      onClose() {
        t.fail()
      },
    })

    resolve('done')
  })

  await retryableAssertion(t, tt => {
    tt.is(onConnectCount, 2)
    tt.is(beforeHandleMessageCount, 6) // 2x awareness per conn, 2x sync per conn (step 1 + 2)
  })

})

test('an exception thrown in beforeHandleMessage closes the connection', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus({
      async beforeHandleMessage() {
        throw new Error()
      },
    })

    newHocuspocusProvider(server, {
      onClose() {
        t.pass()
        resolve('done')
      },
    })
  })
})
