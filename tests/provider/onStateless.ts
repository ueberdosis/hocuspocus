import test from 'ava'
import { newHocuspocus, newHocuspocusProvider } from '../utils/index.ts'

test('executes the onCommand callback', async t => {
  const commandType = 'test-command'
  const commandPayload = { key: 'value' }
  await new Promise(async resolve => {
    newHocuspocus({
      async onCommand({ type, payload }) {
        t.is(type, commandType)
        t.deepEqual(payload, commandPayload)
        t.pass()
        resolve('done')
      },
    }).then(server => {
      const provider = newHocuspocusProvider(server, {
        onSynced: () => {
          provider.sendCommand(commandType, commandPayload)
        },
      })
    })
  })
})
