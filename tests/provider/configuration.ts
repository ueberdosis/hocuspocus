import test from 'ava'
import { newHocuspocus, newHocuspocusProvider } from '../utils'

test('has default configuration (maxDelay = 30000)', async t => {
  const server = newHocuspocus()
  const client = newHocuspocusProvider(server, {
    name: 'hocuspocus-test',
  })

  t.is(client.configuration.maxDelay, 30000)
})

test('overwrites the default configuration', async t => {
  const server = newHocuspocus()
  const client = newHocuspocusProvider(server, {
    name: 'hocuspocus-test',
    maxDelay: 10000,
  })

  t.is(client.configuration.maxDelay, 10000)
})
