import test from 'ava'
import { newHocuspocus, newHocuspocusProvider, sleep } from '../utils'

test('direct connection prevents document from being removed from memory', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus()

    await server.getDirectConnection({ documentName: 'hocuspocus-test' })

    const provider = newHocuspocusProvider(server, {
      onSynced() {
        provider.configuration.websocketProvider.destroy()
        provider.destroy()

        sleep(server.configuration.debounce + 50).then(() => {
          t.is(server.getDocumentsCount(), 1)
          resolve('done')
        })
      },
    })
  })
})

test('direct connection can transact', async t => {
  const server = await newHocuspocus()

  const direct = await server.getDirectConnection({ documentName: 'hocuspocus-test' })

  await direct.transact(document => {
    document.getArray('test').insert(0, ['value'])
  })

  t.is(direct.document?.getArray('test').toJSON()[0], 'value')
})

test('direct connection cannot transact once closed', async t => {
  const server = await newHocuspocus()

  const direct = await server.getDirectConnection({ documentName: 'hocuspocus-test' })
  direct.disconnect()

  try {
    await direct.transact(document => {
      document.getArray('test').insert(0, ['value'])
    })
    t.fail('DirectConnection should throw an error when transacting on closed connection')
  } catch (err) {
    if (err instanceof Error && err.message === 'direct connection closed') {
      t.pass()
    } else {
      t.fail('unknown error')
    }
  }
})
