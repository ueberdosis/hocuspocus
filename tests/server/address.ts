import { describe, expect, onTestFinished, test } from 'vite-plus/test'
import { pass } from '../utils/index.ts'

import { Server } from '@hocuspocus/server'
import { newHocuspocus } from '../utils/index.ts'

describe('address', () => {
  test('returns a dynamic HTTP/WebSocket address with the correct port', async t => {
    const hocuspocus = await newHocuspocus({
      port: 4010,
    })

    expect(hocuspocus.server!.address.port).toBe(4010)
    expect(hocuspocus.server!.httpURL).toBe('http://0.0.0.0:4010')
    expect(hocuspocus.server!.webSocketURL).toBe('ws://0.0.0.0:4010')

    pass()
  })

  test('binds to the configured address', async t => {
    const server = new Server({
      port: 0,
      address: '127.0.0.1',
      stopOnSignals: false,
    })

    onTestFinished(() => server.httpServer.close())

    await server.listen()

    const addressInfo = server.httpServer.address()
    expect(addressInfo && typeof addressInfo === 'object').toBeTruthy()
    if (addressInfo && typeof addressInfo === 'object') {
      expect(addressInfo.address).toBe('127.0.0.1')
      expect(addressInfo.family).toBe('IPv4')
    }

    expect(server.httpURL).toBe(`http://127.0.0.1:${server.address.port}`)

    const response = await fetch(server.httpURL)
    expect(await response.text()).toBe('Welcome to Hocuspocus!')
  })

  test('binds to all interfaces when no address is configured', async t => {
    const server = new Server({
      port: 0,
      stopOnSignals: false,
    })

    onTestFinished(() => server.httpServer.close())

    await server.listen()

    const addressInfo = server.httpServer.address()
    expect(addressInfo && typeof addressInfo === 'object').toBeTruthy()
    if (addressInfo && typeof addressInfo === 'object') {
      expect(['::', '0.0.0.0'].includes(addressInfo.address)).toBe(true)
    }

    expect(server.httpURL).toBe(`http://0.0.0.0:${server.address.port}`)

    const response = await fetch(server.httpURL)
    expect(await response.text()).toBe('Welcome to Hocuspocus!')
  })
})
