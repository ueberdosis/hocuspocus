import test from 'ava'
import { newHocuspocus, newHocuspocusProvider, randomInteger, sleep } from '../utils'

test('documents count is zero by default', async t => {
  const server = newHocuspocus()

  t.is(server.getDocumentsCount(), 0)
})

test('documents count is 1 when one provider is connected', async t => {
  await new Promise(resolve => {
    const server = newHocuspocus()

    newHocuspocusProvider(server, {
      onSynced() {
        t.is(server.getDocumentsCount(), 1)

        resolve('done')
      },
    })
  })
})

test('the same document name counts as one document', async t => {
  const server = newHocuspocus()

  const providers = [
    newHocuspocusProvider(server, { name: 'foobar' }),
    newHocuspocusProvider(server, { name: 'foobar' }),
  ]
  await sleep(100)

  t.is(server.getDocumentsCount(), 1)

  providers.forEach(provider => provider.disconnect())
  await sleep(100)

  t.is(server.getConnectionsCount(), 0)
})

test('adds and removes different documents properly', async t => {
  const server = newHocuspocus()

  const providers = [
    newHocuspocusProvider(server, { name: 'foo-1' }),
    newHocuspocusProvider(server, { name: 'foo-2' }),
    newHocuspocusProvider(server, { name: 'foo-3' }),
    newHocuspocusProvider(server, { name: 'foo-4' }),
    newHocuspocusProvider(server, { name: 'foo-5' }),
  ]
  await sleep(100)

  t.is(server.getDocumentsCount(), 5)

  providers.forEach(provider => provider.disconnect())
  await sleep(100)

  t.is(server.getConnectionsCount(), 0)
})

test(`adds and removes random number of documents properly`, async t => {
  // random number of providers
  const server = newHocuspocus()
  const numberOfProviders = randomInteger(10, 100)
  const providers = []
  for (let index = 0; index < numberOfProviders; index++) {
    providers.push(
      newHocuspocusProvider(server, { name: `foobar-${index}` }),
    )
  }
  await sleep(100)

  t.is(server.getDocumentsCount(), numberOfProviders)

  // random number of disconnects
  const numberOfDisconnects = randomInteger(1, numberOfProviders)
  for (let index = 0; index < numberOfDisconnects; index++) {
    providers[index].disconnect()
  }
  await sleep(100)

  // check the count
  t.is(server.getConnectionsCount(), numberOfProviders - numberOfDisconnects)
})
