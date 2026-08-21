import { describe, expect, test } from 'vite-plus/test'

import type { onAwarenessUpdatePayload } from '@hocuspocus/server'
import { newHocuspocus, newHocuspocusProvider } from '../utils/index.ts'

describe('onAwarenessUpdate', () => {
  test('executes the onAwarenessUpdate callback', async t => {
    await new Promise(async resolve => {
      let resolved = false

      const server = await newHocuspocus({
        async onAwarenessUpdate({ states }) {
          if (resolved) return
          resolved = true

          expect(states.length).toBe(1)
          expect(states[0].foo).toBe('bar')

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
      let resolved = false

      class CustomExtension {
        async onAwarenessUpdate({ states }: onAwarenessUpdatePayload) {
          if (resolved) return
          resolved = true

          expect(states.length).toBe(1)
          expect(states[0].foo).toBe('bar')

          resolve('done')
        }
      }

      const server = await newHocuspocus({
        extensions: [new CustomExtension()],
      })

      const provider = newHocuspocusProvider(server, {
        onConnect() {
          provider.setAwarenessField('foo', 'bar')
        },
      })
    })
  })

  test('forwards the originating connection on onAwarenessUpdate', async t => {
    await new Promise(async resolve => {
      let resolved = false

      const server = await newHocuspocus({
        async onAuthenticate() {
          return { user: { id: 'u-1', displayName: 'Test User' } }
        },
        async onAwarenessUpdate({ connection, states }) {
          if (resolved || states.length === 0) return
          resolved = true

          expect(
            connection,
            'connection should be defined for client-originated awareness updates',
          ).toBeTruthy()
          expect((connection?.context as { user: { id: string } } | undefined)?.user?.id).toBe(
            'u-1',
          )

          resolve('done')
        },
      })

      const provider = newHocuspocusProvider(server, {
        token: 'anything',
        onConnect() {
          provider.setAwarenessField('foo', 'bar')
        },
      })
    })
  })
})
