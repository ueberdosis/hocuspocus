import test from 'ava'
import { newHocuspocus, newHocuspocusProvider } from '../utils'

test('broadcast stateless message to all connections', async t => {
  await new Promise(async resolve => {
    const payloadToSend = 'STATELESS-MESSAGE'
    const server = await newHocuspocus({
      onStateless: async ({ document }) => {
        await document.sendStateless(payloadToSend)
      },
    })

    let count = 2
    const onStatelessCallback = (payload: string) => {
      t.is(payload, payloadToSend)
      count -= 1
      if (count === 0) {
        t.pass()
        resolve('done')
      }
    }

    newHocuspocusProvider(server, { onStateless: ({ payload }) => onStatelessCallback(payload) })
    const provider = newHocuspocusProvider(server, {
      onStateless: ({ payload }) => onStatelessCallback(payload),
      onSynced: () => {
        provider.sendStateless(payloadToSend)
      },
    })
  })
})
