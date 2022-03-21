import test from 'ava'
import { newHocuspocus, newHocuspocusProvider, sleep } from '../utils'
import * as Y from 'yjs'

test('observeDeep is called just once', async t => {
  let count = 0

  const server = newHocuspocus()
  const provider = newHocuspocusProvider(server)

  const type = provider.document.get(
    'xmlText',
    Y.XmlText
  ) as unknown as Y.XmlText

  // Count how often observeDeep is called …
  type.observeDeep((events, transaction) => {
    count++
  })

  // Insert something …
  type.insert(1, 'a')

  await sleep(100)

  t.is(count, 1)
})

test('observeDeep is called for every single change', async t => {
  let count = 0

  const server = newHocuspocus()
  const provider = newHocuspocusProvider(server)

  const type = provider.document.get(
    'xmlText',
    Y.XmlText
  ) as unknown as Y.XmlText

  // Count how often observeDeep is called …
  type.observeDeep((events, transaction) => {
    count++
  })

  // Insert something …
  type.insert(1, 'a')
  type.insert(2, 'b')
  type.insert(3, 'c')

  await sleep(100)

  t.is(count, 3)
})

test('observeDeep is called once for a single transaction', async t => {
  let count = 0

  const server = newHocuspocus()
  const provider = newHocuspocusProvider(server)

  const type = provider.document.get(
    'xmlText',
    Y.XmlText
  ) as unknown as Y.XmlText

  // Count how often observeDeep is called …
  type.observeDeep((events, transaction) => {
    count++
  })

  // Insert something …
  Y.transact(provider.document, () => {
    type.insert(1, 'a')
    type.insert(2, 'b')
    type.insert(3, 'c')
  })

  await sleep(100)

  t.is(count, 1)
})
