import { describe, expect, test } from 'vite-plus/test'
import { pass } from '../utils/index.ts'

import { newHocuspocus, newHocuspocusProvider, sleep } from '../utils/index.ts'

describe('onAwarenessChange', () => {
  test('onAwarenessChange callback is executed', async t => {
    await new Promise(async resolve => {
      let resolved = false
      const server = await newHocuspocus()

      const provider = newHocuspocusProvider(server, {
        onConnect() {
          provider.setAwarenessField('foo', 'bar')
        },
        onAwarenessChange: ({ states }) => {
          if (resolved) return
          resolved = true

          expect(states.length).toBe(1)
          expect(states[0].foo).toBe('bar')

          resolve('done')
        },
      })
    })
  })

  test('onAwarenessChange callback is executed, even when no awareness fields are set', async t => {
    await new Promise(async resolve => {
      let resolved = false
      const server = await newHocuspocus()

      const provider = newHocuspocusProvider(server, {
        onAwarenessChange: ({ states }) => {
          if (resolved) return
          resolved = true

          expect(states.length).toBe(2)

          resolve('done')
        },
      })

      const anotherProvider = newHocuspocusProvider(server, {
        async onConnect() {
          anotherProvider.setAwarenessField('foo', 'bar')
          provider.configuration.websocketProvider.connect()
        },
      })
    })

    pass()
  })

  test('onAwarenessChange callback is executed on provider destroy', async t => {
    await new Promise(async resolve => {
      let resolved = false
      const server = await newHocuspocus()

      const provider = newHocuspocusProvider(
        server,
        {
          onConnect() {
            provider.destroy()
          },
          onAwarenessChange: ({ states }) => {
            if (resolved) return
            resolved = true

            expect(states.length).toBe(0)
            resolve('done')
          },
        },
        {
          maxAttempts: 1,
        },
      )
    })
  })

  test('gets the current awareness states from the server', async t => {
    await new Promise(async resolve => {
      let resolved = false
      const server = await newHocuspocus()

      const provider = newHocuspocusProvider(server)
      const provider2 = newHocuspocusProvider(server, {
        onAwarenessChange: ({ states }) => {
          if (resolved) return
          const state = states.find(state => state.foo === 'bar')

          if (state && state.foo === 'bar') {
            resolved = true
            pass()
            resolve('done')
          }
        },
      })

      provider.setAwarenessField('foo', 'bar')
    })
  })

  test('shares awareness state with other users', async t => {
    await new Promise(async resolve => {
      let resolved = false
      const server = await newHocuspocus()

      const provider = newHocuspocusProvider(server, {
        onConnect() {
          provider.setAwarenessField('name', 'player1')
        },
        onAwarenessChange: ({ states }) => {
          if (resolved) return
          const player2 = !!states.filter(state => state.name === 'player2').length

          if (player2) {
            resolved = true
            expect(player2).toBe(true)
            resolve('done')
          }
        },
      })

      const anotherProvider = newHocuspocusProvider(server, {
        onConnect() {
          anotherProvider.setAwarenessField('name', 'player2')
        },
        onAwarenessChange: ({ states }) => {
          if (resolved) return
          const player1 = !!states.filter(state => state.name === 'player1').length

          if (player1) {
            expect(player1).toBe(true)
          }
        },
      })
    })
  })

  test('does not share awareness state with users in other documents', async t => {
    await new Promise(async resolve => {
      const server = await newHocuspocus()

      newHocuspocusProvider(server, {
        async onConnect() {
          await sleep(100)

          pass()
          resolve('done')
        },
        onAwarenessChange: ({ states }) => {
          const player2 = !!states.filter(state => state.name === 'player2').length

          if (player2) {
            expect.fail('Awareness state leaked!')
          }
        },
      })

      const anotherProvider = newHocuspocusProvider(server, {
        name: 'completely-different-and-unrelated-document',
        onConnect() {
          anotherProvider.setAwarenessField('name', 'player2')
        },
      })
    })
  })
})
