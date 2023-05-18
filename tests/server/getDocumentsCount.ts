import test from 'ava'
import {
  newHocuspocus, newHocuspocusProvider, randomInteger,
} from '../utils/index.js'
import { retryableAssertion } from '../utils/retryableAssertion.js'

test('documents count is zero by default', async t => {
  const server = await newHocuspocus()

  t.is(server.getDocumentsCount(), 0)
})

test('documents count is 1 when one provider is connected', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus()

    newHocuspocusProvider(server, {
      onSynced() {
        t.is(server.getDocumentsCount(), 1)

        resolve('done')
      },
    })
  })
})

test('the same document name counts as one document', async t => {
  const server = await newHocuspocus()

  const providers = [
    newHocuspocusProvider(server, { name: 'foobar' }),
    newHocuspocusProvider(server, { name: 'foobar' }),
  ]

  await retryableAssertion(t, tt => {
    tt.is(server.getDocumentsCount(), 1)
  })

  providers.forEach(provider => { provider.disconnect(); provider.configuration.websocketProvider.disconnect() })

  await retryableAssertion(t, tt => {
    tt.is(server.getConnectionsCount(), 0)
  })
})

test('adds and removes different documents properly', async t => {
  const server = await newHocuspocus()

  const providers = [
    newHocuspocusProvider(server, { name: 'foo-1' }),
    newHocuspocusProvider(server, { name: 'foo-2' }),
    newHocuspocusProvider(server, { name: 'foo-3' }),
    newHocuspocusProvider(server, { name: 'foo-4' }),
    newHocuspocusProvider(server, { name: 'foo-5' }),
  ]

  await retryableAssertion(t, tt => {
    tt.is(server.getDocumentsCount(), 5)
  })

  providers.forEach(provider => { provider.disconnect(); provider.configuration.websocketProvider.disconnect() })

  await retryableAssertion(t, tt => {
    tt.is(server.getConnectionsCount(), 0)
  })
})

test('adds and removes random number of documents properly', async t => {
  // random number of providers
  const server = await newHocuspocus()
  const numberOfProviders = randomInteger(10, 100)
  const providers = []
  for (let index = 0; index < numberOfProviders; index += 1) {
    providers.push(
      newHocuspocusProvider(server, { name: `foobar-${index}` }),
    )
  }
  await retryableAssertion(t, tt => {
    tt.is(server.getDocumentsCount(), numberOfProviders)
  })

  // random number of disconnects
  const numberOfDisconnects = randomInteger(1, numberOfProviders)
  for (let index = 0; index < numberOfDisconnects; index += 1) {
    providers[index].disconnect()
    providers[index].configuration.websocketProvider.disconnect()
  }

  // check the count
  await retryableAssertion(t, tt => {
    tt.is(server.getConnectionsCount(), numberOfProviders - numberOfDisconnects)
  })
})
