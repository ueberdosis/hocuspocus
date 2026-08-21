import { describe, expect, test } from 'vite-plus/test'

import { newHocuspocus, newHocuspocusProviderWebsocket } from '../utils/index.ts'

describe('configuration', () => {
  test('has default configuration (maxDelay = 30000)', async t => {
    const server = await newHocuspocus()
    const client = newHocuspocusProviderWebsocket(server)

    expect(client.configuration.maxDelay).toBe(30000)
  })

  test('overwrites the default configuration', async t => {
    const server = await newHocuspocus()
    const client = newHocuspocusProviderWebsocket(server, {
      maxDelay: 10000,
    })

    expect(client.configuration.maxDelay).toBe(10000)
  })
})
