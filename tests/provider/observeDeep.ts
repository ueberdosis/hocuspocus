import test from 'ava'
import * as Y from 'yjs'
import { newHocuspocus, newHocuspocusProvider } from '../utils/index.js'
import { retryableAssertion } from '../utils/retryableAssertion.js'

test('observeDeep is called just once', async t => {
  let count = 0

  const server = await newHocuspocus()
  const provider = newHocuspocusProvider(server)

  const type = provider.document.get(
    'xmlText',
    Y.XmlText,
  ) as unknown as Y.XmlText

  // Count how often observeDeep is called …
  type.observeDeep((events, transaction) => {
    count += 1
  })

  // Insert something …
  type.insert(1, 'a')

  await retryableAssertion(t, tt => {
    tt.is(count, 1)
  })
})

test('observeDeep is called for every single change', async t => {
  let count = 0

  const server = await newHocuspocus()
  const provider = newHocuspocusProvider(server)

  const type = provider.document.get(
    'xmlText',
    Y.XmlText,
  ) as unknown as Y.XmlText

  // Count how often observeDeep is called …
  type.observeDeep((events, transaction) => {
    count += 1
  })

  // Insert something …
  type.insert(1, 'a')
  type.insert(2, 'b')
  type.insert(3, 'c')

  await retryableAssertion(t, tt => {
    tt.is(count, 3)
  })
})

test('observeDeep is called once for a single transaction', async t => {
  let count = 0

  const server = await newHocuspocus()
  const provider = newHocuspocusProvider(server)

  const type = provider.document.get(
    'xmlText',
    Y.XmlText,
  ) as unknown as Y.XmlText

  // Count how often observeDeep is called …
  type.observeDeep((events, transaction) => {
    count += 1
  })

  // Insert something …
  Y.transact(provider.document, () => {
    type.insert(1, 'a')
    type.insert(2, 'b')
    type.insert(3, 'c')
  })

  await retryableAssertion(t, tt => {
    tt.is(count, 1)
  })
})
