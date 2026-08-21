// eslint-disable-next-line import/no-extraneous-dependencies
import { describe, expect, test } from 'vite-plus/test'

import { Database } from '@hocuspocus/extension-database'
import { newHocuspocus, newHocuspocusProvider } from '../utils/index.ts'

describe('fetch', () => {
  test('fetch has the document name', async t => {
    await new Promise(async resolve => {
      const server = await newHocuspocus({
        extensions: [
          new Database({
            async fetch({ documentName }) {
              expect(documentName).toBe('my-unique-document-name')

              resolve('done')

              return null
            },
          }),
        ],
      })

      newHocuspocusProvider(server, {
        name: 'my-unique-document-name',
      })
    })
  })

  test('passes context from onAuthenticate to fetch', async t => {
    await new Promise(async resolve => {
      const server = await newHocuspocus({
        extensions: [
          new Database({
            async fetch({ context }) {
              expect(context).toStrictEqual({
                user: 123,
              })

              resolve('done')

              return null
            },
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
        name: 'my-unique-document-name',
      })
    })
  })
})
