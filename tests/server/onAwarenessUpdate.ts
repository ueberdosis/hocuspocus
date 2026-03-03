import test from 'ava'
import type { onAwarenessUpdatePayload } from '@hocuspocus/server'
import { newHocuspocus, newHocuspocusProvider } from '../utils/index.ts'

test('executes the onAwarenessUpdate callback', async t => {
  await new Promise(async resolve => {
    let resolved = false

    const server = await newHocuspocus(t, {
      async onAwarenessUpdate({ states }) {
        if (resolved) return
        resolved = true

        t.is(states.length, 1)
        t.is(states[0].foo, 'bar')

        resolve('done')
      },
    })

    const provider = newHocuspocusProvider(t, server, {
      onConnect() {
        provider.setAwarenessField('foo', 'bar')
      },
    })
  })
})

test('executes the onAwarenessUpdate callback from a custom extension', async t => {
  await new Promise(async resolve => {
    let resolved = false

    class CustomExtension {
      async onAwarenessUpdate({ states }: onAwarenessUpdatePayload) {
        if (resolved) return
        resolved = true

        t.is(states.length, 1)
        t.is(states[0].foo, 'bar')

        resolve('done')
      }
    }

    const server = await newHocuspocus(t, {
      extensions: [
        new CustomExtension(),
      ],
    })

    const provider = newHocuspocusProvider(t, server, {
      onConnect() {
        provider.setAwarenessField('foo', 'bar')
      },
    })
  })
})
