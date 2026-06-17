import test from 'ava'
import { newHocuspocus, newHocuspocusProvider } from '../utils/index.ts'
import { retryableAssertion } from '../utils/retryableAssertion.ts'

test('afterHandleMessage is called after the update has been applied', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus(t, {
      async afterHandleMessage({ document }) {
        // contrary to beforeHandleMessage, the update is already applied here
        if (document.getArray('foo').get(0) === 'bar') {
          t.pass()
          resolve('done')
        }
      },
    })

    const provider = newHocuspocusProvider(t, server, {
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
    const server = await newHocuspocus(t, {
      async beforeHandleMessage() {
        beforeHandleMessageCount += 1
      },
      async afterHandleMessage() {
        afterHandleMessageCount += 1
      },
    })

    newHocuspocusProvider(t, server, {
      onClose() {
        t.fail()
      },
    })
    newHocuspocusProvider(t, server, {
      onClose() {
        t.fail()
      },
    })

    resolve('done')
  })

  await retryableAssertion(t, tt => {
    tt.true(afterHandleMessageCount > 0)
    tt.is(afterHandleMessageCount, beforeHandleMessageCount)
  })
})

test('afterHandleMessage is not called when beforeHandleMessage rejects', async t => {
  let afterHandleMessageCount = 0

  await new Promise(async resolve => {
    const server = await newHocuspocus(t, {
      async beforeHandleMessage() {
        throw new Error()
      },
      async afterHandleMessage() {
        afterHandleMessageCount += 1
      },
    })

    newHocuspocusProvider(t, server, {
      onClose() {
        resolve('done')
      },
    })
  })

  await retryableAssertion(t, tt => {
    tt.is(afterHandleMessageCount, 0)
  })
})

test('an exception thrown in afterHandleMessage does not close the connection', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus(t, {
      async afterHandleMessage() {
        throw new Error()
      },
    })

    const provider = newHocuspocusProvider(t, server, {
      onClose() {
        t.fail()
      },
      onSynced() {
        t.pass()
        setTimeout(() => resolve('done'), 100)
      },
    })
  })
})
