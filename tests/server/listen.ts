import { describe, expect, onTestFinished, test } from 'vite-plus/test'

import { Server } from '@hocuspocus/server'
import { newHocuspocus } from '../utils/index.ts'

describe('listen', () => {
  test('should respond with OK', async t => {
    const hocuspocus = await newHocuspocus()

    const response = await fetch(hocuspocus.server!.httpURL)

    expect(await response.text()).toBe('Welcome to Hocuspocus!')
  })

  test('should respond with status 200', async t => {
    const hocuspocus = await newHocuspocus()

    const response = await fetch(hocuspocus.server!.httpURL)

    expect(await response.status).toBe(200)
  })

  test('should respond with OK on a custom port', async t => {
    const hocuspocus = await newHocuspocus({
      port: 4000,
    })

    const response = await fetch(hocuspocus.server!.httpURL)

    expect(hocuspocus.server!.address.port).toBe(4000)
    expect(await response.text()).toBe('Welcome to Hocuspocus!')
  })

  test('should respond with OK on a custom port passed to listen()', async t => {
    const server = new Server({
      port: 0,
      stopOnSignals: false,
    })

    onTestFinished(() => server.httpServer.close())

    server.listen(4001)

    const response = await fetch(server.httpURL)

    expect(server.address.port).toBe(4001)
    expect(await response.text()).toBe('Welcome to Hocuspocus!')
  })

  test('should take a custom port and a callback', async t => {
    const server = new Server({
      port: 0,
      stopOnSignals: false,
    })

    onTestFinished(() => server.httpServer.close())

    await new Promise(async resolve => {
      server.listen(4002, () => {
        resolve('done')
      })
    })

    const response = await fetch(server.httpURL)

    expect(server.address.port).toBe(4002)
    expect(await response.text()).toBe('Welcome to Hocuspocus!')
  })

  test('should execute a callback', async t => {
    const server = new Server({
      port: 0,
      stopOnSignals: false,
    })

    onTestFinished(() => server.httpServer.close())

    await new Promise(async resolve => {
      server.listen(0, async () => {
        resolve('done')
      })
    })

    const response = await fetch(server.httpURL)

    expect(await response.text()).toBe('Welcome to Hocuspocus!')
  })

  test('should have the custom port as a parameter in the callback', async t => {
    const server = new Server({
      port: 0,
      stopOnSignals: false,
    })

    onTestFinished(() => server.httpServer.close())

    await new Promise(async resolve => {
      server.listen(0, async ({ port }: any) => {
        expect(port).toBe(server.address.port)
        resolve('done')
      })
    })

    const response = await fetch(server.httpURL)

    expect(await response.text()).toBe('Welcome to Hocuspocus!')
  })
})
