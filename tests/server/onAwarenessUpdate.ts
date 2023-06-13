import test from 'ava'
import { onAwarenessUpdatePayload } from '@hocuspocus/server'
import { newHocuspocus, newHocuspocusProvider } from '../utils/index.js'

test('executes the onAwarenessUpdate callback', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus({
      async onAwarenessUpdate({ states }) {
        t.is(states.length, 1)
        t.is(states[0].foo, 'bar')

        resolve('done')
      },
    })

    const provider = newHocuspocusProvider(server, {
      onConnect() {
        provider.setAwarenessField('foo', 'bar')
      },
    })
  })
})

test('executes the onAwarenessUpdate callback from a custom extension', async t => {
  await new Promise(async resolve => {
    class CustomExtension {
      async onAwarenessUpdate({ states }: onAwarenessUpdatePayload) {
        t.is(states.length, 1)
        t.is(states[0].foo, 'bar')

        resolve('done')
      }
    }

    const server = await newHocuspocus({
      extensions: [
        new CustomExtension(),
      ],
    })

    const provider = newHocuspocusProvider(server, {
      onConnect() {
        provider.setAwarenessField('foo', 'bar')
      },
    })
  })
})
