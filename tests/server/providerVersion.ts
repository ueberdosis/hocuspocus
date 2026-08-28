import { describe, expect, test } from 'vite-plus/test'

import type { connectedPayload, onAuthenticatePayload, onConnectPayload } from '@hocuspocus/server'
import {
  newHocuspocus,
  newHocuspocusProvider,
  newHocuspocusProviderWebsocket,
} from '../utils/index.ts'

describe('providerVersion', () => {
  test('onAuthenticate receives providerVersion', async t => {
    await new Promise(async resolve => {
      const server = await newHocuspocus({
        async onAuthenticate({ providerVersion }: onAuthenticatePayload) {
          expect(typeof providerVersion).toBe('string')
          expect(providerVersion).not.toBe(null)
          resolve('done')
        },
      })

      newHocuspocusProvider(server, {
        token: 'test-token',
      })
    })
  })

  test('onConnect receives providerVersion', async t => {
    await new Promise(async resolve => {
      const server = await newHocuspocus({
        async onConnect({ providerVersion }: onConnectPayload) {
          expect(typeof providerVersion).toBe('string')
          expect(providerVersion).not.toBe(null)
          resolve('done')
        },
      })

      newHocuspocusProvider(server, {
        token: 'test-token',
      })
    })
  })

  test('connected receives providerVersion and it is set on the connection', async t => {
    await new Promise(async resolve => {
      const server = await newHocuspocus({
        async connected({ providerVersion, connection }: connectedPayload) {
          expect(typeof providerVersion).toBe('string')
          expect(providerVersion).not.toBe(null)
          expect(connection.providerVersion).toBe(providerVersion)
          resolve('done')
        },
      })

      newHocuspocusProvider(server, {
        token: 'test-token',
      })
    })
  })

  test('providerVersion is a non-empty string', async t => {
    await new Promise(async resolve => {
      const server = await newHocuspocus({
        async onAuthenticate({ providerVersion }: onAuthenticatePayload) {
          expect(typeof providerVersion).toBe('string')
          expect(providerVersion!.length > 0).toBeTruthy()
          resolve('done')
        },
      })

      newHocuspocusProvider(server, {
        token: 'test-token',
      })
    })
  })

  test('providerVersion is the same across multiplexed documents', async t => {
    await new Promise(async resolve => {
      const versions: string[] = []

      const server = await newHocuspocus({
        async onAuthenticate({ providerVersion }: onAuthenticatePayload) {
          versions.push(providerVersion!)
          if (versions.length === 2) {
            expect(versions[0]).toBe(versions[1])
            expect(versions[0]).not.toBe(null)
            resolve('done')
          }
        },
      })

      const ws = newHocuspocusProviderWebsocket(server)

      newHocuspocusProvider(server, { name: 'doc1', token: 't1' }, {}, ws)
      newHocuspocusProvider(server, { name: 'doc2', token: 't2' }, {}, ws)
    })
  })
})
