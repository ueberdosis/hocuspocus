import test from 'ava'
import * as Y from 'yjs'

import { newHocuspocus, newHocuspocusProvider } from '../utils/index.js'

test('subdocs are not loaded by default', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus({})

    const provider = newHocuspocusProvider(server, {
      onSynced() {
        const subdoc = new Y.Doc()
        subdoc.getText().insert(0, 'hi!')
        provider.document.getMap<Y.Doc>('subdocs').set('subdoc1', subdoc)

        const provider2 = newHocuspocusProvider(server, {
          onSynced() {
            const subdocs = provider2.document.getMap<Y.Doc>('subdocs')

            const subdoc1 = subdocs.get('subdoc1')

            if (!subdoc1) {
              throw new Error('subdoc1 doesnt exist')
            }

            t.is(subdoc1.getText().toJSON(), '')
            // subdoc1.load()

            // subdoc1.on('update', () => {
            // t.is(subdoc1.getText().toJSON(), 'hi!')
            resolve('')
            // })
          },
        })

      },
    })
  })
})

test('subdocs are loaded when loaded specifically', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus({ })

    const provider = newHocuspocusProvider(server, {
      onSynced() {
        const subdoc = new Y.Doc()
        subdoc.getText().insert(0, 'hi!')
        provider.document.getMap<Y.Doc>('subdocs').set('subdoc1', subdoc)

        const provider2 = newHocuspocusProvider(server, {
          onSynced() {
            const subdocs = provider2.document.getMap<Y.Doc>('subdocs')

            const subdoc1 = subdocs.get('subdoc1')

            if (!subdoc1) {
              throw new Error('subdoc1 doesnt exist')
            }

            t.is(subdoc1.getText().toJSON(), '')
            subdoc1.load()

            subdoc1.on('update', () => {
              t.is(subdoc1.getText().toJSON(), 'hi!')
              resolve('')
            })
          },
        })

      },
    })
  })
})
