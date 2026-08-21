import { describe, expect, test } from 'vite-plus/test'
import { pass } from '../utils/index.ts'

import { newHocuspocus, newHocuspocusProvider } from '../utils/index.ts'

describe('onAuthenticated', () => {
  test('executes the onAuthenticated callback', async t => {
    await new Promise(async resolve => {
      const server = await newHocuspocus({
        async onAuthenticate({ token }) {
          if (token !== 'SUPER-SECRET-TOKEN') {
            throw new Error()
          }
        },
      })

      const provider = newHocuspocusProvider(server, {
        token: 'SUPER-SECRET-TOKEN',
        onAuthenticated() {
          expect(provider.isAuthenticated).toBe(true)
          expect(provider.authorizedScope).toBe('read-write')
          pass()
          resolve('done')
        },
      })
    })
  })

  test('executes the onAuthenticated callback when token is provided as a function that returns a promise', async t => {
    await new Promise(async resolve => {
      const server = await newHocuspocus({
        async onAuthenticate({ token }) {
          if (token !== 'SUPER-SECRET-TOKEN') {
            throw new Error()
          }
        },
      })

      const provider = newHocuspocusProvider(server, {
        token: async () => Promise.resolve('SUPER-SECRET-TOKEN'),
        onAuthenticated() {
          expect(provider.isAuthenticated).toBe(true)
          expect(provider.authorizedScope).toBe('read-write')
          pass()
          resolve('done')
        },
      })
    })
  })

  test('executes the onAuthenticated callback when token is provided as a function that returns a string', async t => {
    await new Promise(async resolve => {
      const server = await newHocuspocus({
        async onAuthenticate({ token }) {
          if (token !== 'SUPER-SECRET-TOKEN') {
            throw new Error()
          }
        },
      })

      const provider = newHocuspocusProvider(server, {
        token: () => 'SUPER-SECRET-TOKEN',
        onAuthenticated() {
          expect(provider.isAuthenticated).toBe(true)
          expect(provider.authorizedScope).toBe('read-write')
          pass()
          resolve('done')
        },
      })
    })
  })

  test('sets correct scope for readonly', async t => {
    await new Promise(async resolve => {
      const server = await newHocuspocus({
        async onAuthenticate({ token, connectionConfig }) {
          if (token !== 'SUPER-SECRET-TOKEN') {
            throw new Error()
          }
          connectionConfig.readOnly = true
        },
      })

      const provider = newHocuspocusProvider(server, {
        token: 'SUPER-SECRET-TOKEN',
        onAuthenticated() {
          expect(provider.isAuthenticated).toBe(true)
          expect(provider.authorizedScope).toBe('readonly')
          pass()
          resolve('done')
        },
      })
    })
  })
})
