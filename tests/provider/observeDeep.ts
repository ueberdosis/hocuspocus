import test from 'ava'
import { newHocuspocus, newHocuspocusProvider, sleep } from '../utils'
import * as Y from 'yjs'

test('observeDeep is called just once', async t => {
  let count = 0

  await new Promise(resolve => {
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

    resolve('done')
  })

  await sleep(100)

  t.is(count, 1)
})
