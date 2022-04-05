import test from 'ava'
import { newHocuspocus, newHocuspocusProvider } from '../utils'
import { Database } from '@hocuspocus/extension-database'

test('fetch has the document name', async t => {
  await new Promise(resolve => {
    const server = newHocuspocus({
      extensions: [
        new Database({
          async fetch({ documentName }) {
            t.is(documentName, 'my-unique-document-name')

            resolve('done')

            return null
          }
        }),
      ],
    })

    newHocuspocusProvider(server, {
      name: 'my-unique-document-name'
    })
  })
})

test('passes context from onAuthenticate to fetch', async t => {
  await new Promise(resolve => {
    const server = newHocuspocus({
      extensions: [
        new Database({
          async fetch({ context }) {
            t.deepEqual(context, {
              user: 123,
            })

            resolve('done')

            return null
          }
        }),
      ],
      async onAuthenticate() {
        return {
          user: 123,
        }
      },
    })

    newHocuspocusProvider(server, {
      token: 'SUPER-SECRET-TOKEN',
      name: 'my-unique-document-name'
    })
  })
})
