import test from 'ava'
import { newHocuspocus, newHocuspocusProviderWebsocket } from '../utils/index.ts'

test('has default configuration (maxDelay = 30000)', async t => {
  const server = await newHocuspocus()
  const client = newHocuspocusProviderWebsocket(server)

  t.is(client.configuration.maxDelay, 30000)
})

test('overwrites the default configuration', async t => {
  const server = await newHocuspocus()
  const client = newHocuspocusProviderWebsocket(server, {
    maxDelay: 10000,
  })

  t.is(client.configuration.maxDelay, 10000)
})
