import test from 'ava'
import { Server } from '@hocuspocus/server'
import { newHocuspocus } from '../utils/index.ts'

test('returns a dynamic HTTP/WebSocket address with the correct port', async t => {
  const hocuspocus = await newHocuspocus(t, {
    port: 4010,
  })

  t.is(hocuspocus.server!.address.port, 4010)
  t.is(hocuspocus.server!.httpURL, 'http://0.0.0.0:4010')
  t.is(hocuspocus.server!.webSocketURL, 'ws://0.0.0.0:4010')

  t.pass()
})

test('binds to the configured address', async t => {
  const server = new Server({
    port: 0,
    address: '127.0.0.1',
    stopOnSignals: false,
  })

  t.teardown(() => server.httpServer.close())

  await server.listen()

  const addressInfo = server.httpServer.address()
  t.truthy(addressInfo && typeof addressInfo === 'object')
  if (addressInfo && typeof addressInfo === 'object') {
    t.is(addressInfo.address, '127.0.0.1')
    t.is(addressInfo.family, 'IPv4')
  }

  t.is(server.httpURL, `http://127.0.0.1:${server.address.port}`)

  const response = await fetch(server.httpURL)
  t.is(await response.text(), 'Welcome to Hocuspocus!')
})

test('binds to all interfaces when no address is configured', async t => {
  const server = new Server({
    port: 0,
    stopOnSignals: false,
  })

  t.teardown(() => server.httpServer.close())

  await server.listen()

  const addressInfo = server.httpServer.address()
  t.truthy(addressInfo && typeof addressInfo === 'object')
  if (addressInfo && typeof addressInfo === 'object') {
    t.true(['::', '0.0.0.0'].includes(addressInfo.address))
  }

  t.is(server.httpURL, `http://0.0.0.0:${server.address.port}`)

  const response = await fetch(server.httpURL)
  t.is(await response.text(), 'Welcome to Hocuspocus!')
})
