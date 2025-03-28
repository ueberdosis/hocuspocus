import test from 'ava'
import { newHocuspocus, newHocuspocusProvider } from '../utils/index.ts'
import { retryableAssertion } from '../utils/retryableAssertion.ts'

test('beforeSync gets called in proper order', async t => {
  await new Promise(async resolve => {
    const mockContext = {
      user: 123,
    }

    let callNumber = 0

    const server = await newHocuspocus({
      async onConnect() {
        return mockContext
      },
      async beforeSync({ document, context, payload }) {
        t.deepEqual(context, mockContext)

        callNumber += 1

        if (callNumber === 2) {
          resolve('done')
        }
      },
      async onChange({ context, document }) {
        t.deepEqual(context, mockContext)

        const value = document.getArray('foo').get(0)

        t.is(value, 'bar')
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
        if (type === 0){
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
            t.fail()
          },
          onSynced() {
            done('done')
          },
        })
      }),
      new Promise(done => {
        newHocuspocusProvider(server, {
          onClose() {
            t.fail()
          },
          onSynced() {
            done('done')
          },
        })
      }),
    ])

    resolve('done')
  })

  await retryableAssertion(t, tt => {
    tt.is(onConnectCount, 2)
    tt.is(syncstep1Count, 2)
    tt.is(syncstep2Count, 2)
    tt.is(updateCount, 0)
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
        if (type === 0){
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
            t.fail()
          },
          onSynced() {
            done('done')
          },
        })
      }),
      new Promise(done => {
        const provider = newHocuspocusProvider(server, {
          onClose() {
            t.fail()
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

  await retryableAssertion(t, tt => {
    tt.is(onConnectCount, 2)
    tt.is(syncstep1Count, 2)
    tt.is(syncstep2Count, 2)
    tt.is(updateCount, 1)
  })
})
