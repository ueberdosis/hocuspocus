import { describe, expect, test } from 'vite-plus/test'
import { pass } from '../utils/index.ts'

import { AwarenessError } from '@hocuspocus/provider'
import { newHocuspocus, newHocuspocusProvider, sleep } from '../utils/index.ts'

describe('onAwarenessUpdate', () => {
  test('onAwarenessUpdate callback is executed', async t => {
    await new Promise(async resolve => {
      let resolved = false
      const server = await newHocuspocus({})

      const provider = newHocuspocusProvider(server, {
        onConnect() {
          provider.setAwarenessField('foo', 'bar')
        },
        onAwarenessUpdate: ({ states }) => {
          if (resolved) return
          resolved = true

          expect(states.length).toBe(1)
          expect(states[0].foo).toBe('bar')

          resolve('done')
        },
      })
    })
  })

  test('shares awareness state with other users', async t => {
    await new Promise(async resolve => {
      let resolved = false
      const server = await newHocuspocus({})

      const provider = newHocuspocusProvider(server, {
        onConnect() {
          provider.setAwarenessField('name', 'player1')
        },
        onAwarenessUpdate: ({ states }) => {
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
        onAwarenessUpdate: ({ states }) => {
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
      const server = await newHocuspocus({})

      newHocuspocusProvider(server, {
        async onConnect() {
          await sleep(100)

          pass()
          resolve('done')
        },
        onAwarenessUpdate: ({ states }) => {
          const player2 = !!states.filter(state => state.name === 'player2').length

          if (player2) {
            throw new Error('Awareness state leaked!')
          }
        },
      })

      const anotherProvider = newHocuspocusProvider(server, {
        name: 'hocuspocus-completely-different-and-unrelated-document',
        onConnect() {
          anotherProvider.setAwarenessField('name', 'player2')
        },
      })
    })
  })

  test('allows awareness to be null', async t => {
    await new Promise(async resolve => {
      const server = await newHocuspocus({})

      newHocuspocusProvider(server, {
        awareness: null,
        async onConnect() {
          await sleep(100)

          pass()
          resolve('done')
        },
      })
    })
  })

  test('throws an error in setAwarenessFields if awareness is null', async t => {
    await new Promise(async resolve => {
      const server = await newHocuspocus()

      const provider = newHocuspocusProvider(server, {
        awareness: null,
        onConnect() {
          try {
            provider.setAwarenessField('foo', 'bar')
            expect.fail()
          } catch (err: any) {
            if (err instanceof AwarenessError) {
              pass()
            } else {
              expect.fail()
            }
          } finally {
            resolve('done')
          }
        },
      })
    })
  })
})
