import { describe, expect, test } from 'vite-plus/test'
import { pass } from '../utils/index.ts'

import type { HocuspocusProvider } from '@hocuspocus/provider'
import { newHocuspocus, newHocuspocusProvider, sleep } from '../utils/index.ts'

describe('onConnect', () => {
  test('executes the onConnect callback', async t => {
    await new Promise(async resolve => {
      const server = await newHocuspocus({
        async onConnect() {
          pass()
          resolve('done')
        },
      })

      newHocuspocusProvider(server)
    })
  })

  test('refuses connection when an error is thrown', async t => {
    await new Promise(async resolve => {
      const server = await newHocuspocus({
        async onConnect() {
          throw new Error()
        },
      })

      newHocuspocusProvider(server, {
        onAuthenticationFailed() {
          pass()
          resolve('done')
        },
      })
    })
  })

  test('executes the onConnect callback from an extension', async t => {
    await new Promise(async resolve => {
      const server = await newHocuspocus()

      class CustomExtension {
        async onConnect() {
          pass()
          resolve('done')
        }
      }

      server.configure({
        extensions: [new CustomExtension()],
      })

      newHocuspocusProvider(server)
    })
  })

  test('has the document name', async t => {
    await new Promise(async resolve => {
      const server = await newHocuspocus({
        async onConnect({ documentName }) {
          expect(documentName).toBe('hocuspocus-test')
          resolve('done')
        },
      })

      newHocuspocusProvider(server)
    })
  })

  test('sets the provider to readOnly', async t => {
    await new Promise(async resolve => {
      const server = await newHocuspocus({
        async onConnect({ connectionConfig }) {
          connectionConfig.readOnly = true
        },
      })

      newHocuspocusProvider(server, {
        onSynced() {
          for (const connection of server.documents.get('hocuspocus-test')?.connections.keys() ??
            []) {
            expect(connection.readOnly).toBe(true)
          }

          resolve('done')
        },
      })
    })
  })

  const weirdDocumentNames = [
    'not-weird',
    'äöü',
    '<>{}|^ß',
    'with space',
    'with/slash',
    'with\backslash',
    'a-very-long-document-name-which-should-not-make-any-problems-at-all',
    '🌟',
    ':',
    '—',
    '漢',
    'triple   space',
    '*',
  ]

  weirdDocumentNames.forEach(weirdDocumentName => {
    test(`encodes weird document names: "${weirdDocumentName}"`, async t => {
      await new Promise(async resolve => {
        const server = await newHocuspocus({
          async onConnect({ documentName }) {
            expect(documentName).toBe(weirdDocumentName)

            resolve('done')
          },
        })

        newHocuspocusProvider(server, {
          name: weirdDocumentName,
        })
      })
    })
  })

  test('rejects empty document name via WebSocket', async t => {
    await new Promise(async resolve => {
      const server = await newHocuspocus()

      newHocuspocusProvider(server, {
        name: '',
        onAuthenticationFailed() {
          expect(server.getDocumentsCount()).toBe(0)
          pass()
          resolve('done')
        },
      })
    })
  })

  test('rejects whitespace-only document name via WebSocket', async t => {
    await new Promise(async resolve => {
      const server = await newHocuspocus()

      newHocuspocusProvider(server, {
        name: '   ',
        onAuthenticationFailed() {
          expect(server.getDocumentsCount()).toBe(0)
          pass()
          resolve('done')
        },
      })
    })
  })

  test('stops when the onConnect hook throws an Error', async t => {
    await new Promise(async resolve => {
      const server = await newHocuspocus({
        onConnect() {
          throw new Error()
        },
        // MUST NOT BE CALLED
        async onLoadDocument() {
          expect.fail('WARNING: When onConnect fails onLoadDocument must not be called.')
        },
      })

      newHocuspocusProvider(server, {
        onAuthenticationFailed() {
          pass()
          resolve('done')
        },
      })
    })
  })

  test('stops when the onConnect hook returns a rejecting promise', async t => {
    await new Promise(async resolve => {
      const server = await newHocuspocus({
        onConnect() {
          return Promise.reject()
        },
        // MUST NOT BE CALLED
        async onLoadDocument() {
          expect.fail('WARNING: When onConnect fails onLoadDocument must not be called.')
        },
      })

      newHocuspocusProvider(server, {
        onAuthenticationFailed() {
          pass()
          resolve('done')
        },
      })
    })
  })

  test('has the request headers', async t => {
    await new Promise(async resolve => {
      const server = await newHocuspocus({
        async onConnect({ requestHeaders }) {
          expect(requestHeaders.get('connection') !== null).toBe(true)
          resolve('done')
        },
      })

      newHocuspocusProvider(server)
    })
  })

  test('has the whole request', async t => {
    await new Promise(async resolve => {
      const server = await newHocuspocus({
        async onConnect({ request }) {
          expect(new URL(request.url).pathname).toBe('/')
          resolve('done')
        },
      })

      newHocuspocusProvider(server)
    })
  })

  test('has the socketId', async t => {
    await new Promise(async resolve => {
      const server = await newHocuspocus({
        async onConnect({ socketId }) {
          expect(socketId !== undefined).toBe(true)
          resolve('done')
        },
      })

      newHocuspocusProvider(server)
    })
  })

  test('has the server instance', async t => {
    await new Promise(async resolve => {
      const server = await newHocuspocus({
        async onConnect({ instance }) {
          expect(instance).toBe(server)
          resolve('done')
        },
      })

      newHocuspocusProvider(server)
    })
  })

  test('defaults to readOnly = false', async t => {
    await new Promise(async resolve => {
      const server = await newHocuspocus({
        async onConnect({ connectionConfig }) {
          expect(connectionConfig.readOnly).toBe(false)
          resolve('done')
        },
      })

      newHocuspocusProvider(server)
    })
  })

  test('cleans up correctly when provider disconnects during onLoadDocument', async t => {
    await new Promise(async resolve => {
      // eslint-disable-next-line prefer-const
      let provider: HocuspocusProvider

      const server = await newHocuspocus({
        onLoadDocument: async () => {
          provider.configuration.websocketProvider.disconnect()
          provider.disconnect()

          // pretent we loaded data from async source
          await sleep(100)
        },
      })

      provider = newHocuspocusProvider(server, {
        name: 'super-unique-name',
        async onDisconnect() {
          await sleep(100)

          expect(server.documents.get('super-unique-name'), 'no documents').toBe(undefined)
          resolve('done')
        },
      })
    })
  })

  test('the connections count is correct', async t => {
    await new Promise(async resolve => {
      const server = await newHocuspocus({
        async connected() {
          expect(server.getConnectionsCount()).toBe(1)
          resolve('done')
        },
      })

      newHocuspocusProvider(server)
    })
  })

  test('has connection.readOnly', async t => {
    await new Promise(async resolve => {
      const server = await newHocuspocus({
        async onConnect({ connectionConfig }) {
          expect(connectionConfig.readOnly).toBe(false)
          resolve('done')
        },
      })

      newHocuspocusProvider(server)
    })
  })

  test('has the request', async t => {
    await new Promise(async resolve => {
      const server = await newHocuspocus({
        async onConnect({ request }) {
          expect(request.url).toBeTruthy()
          resolve('done')
        },
      })

      newHocuspocusProvider(server)
    })
  })
})
