import test from 'ava'
import { newHocuspocus, newHocuspocusProvider } from '../utils/index.ts'

test('calls the beforeBroadcastCommand hook', async t => {
  await new Promise(async resolve => {
    const commandType = 'test-command'
    const commandPayload = { message: 'hello' }
    const server = await newHocuspocus({
      async beforeBroadcastCommand({ type, payload }) {
        t.is(type, commandType)
        t.deepEqual(payload, commandPayload)
        t.pass()
        resolve('done')
      },
    })

    newHocuspocusProvider(server, {
      onSynced() {
        server.documents.get('hocuspocus-test')?.broadcastCommand(commandType, commandPayload)
      },
    })
  })
})

test('calls the beforeBroadcastEvent hook', async t => {
  await new Promise(async resolve => {
    const eventType = 'test-event'
    const eventPayload = { data: 'world' }
    const server = await newHocuspocus({
      async beforeBroadcastEvent({ type, payload }) {
        t.is(type, eventType)
        t.deepEqual(payload, eventPayload)
        t.pass()
        resolve('done')
      },
    })

    newHocuspocusProvider(server, {
      onSynced() {
        server.documents.get('hocuspocus-test')?.broadcastEvent(eventType, eventPayload)
      },
    })
  })
})
