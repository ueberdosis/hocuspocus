import { describe, expect, test } from 'vite-plus/test'

import { newHocuspocus, newHocuspocusProvider } from '../utils/index.ts'

describe('beforeHandleAwareness', () => {
  test('beforeHandleAwareness is called before the awareness state is applied', async t => {
    await new Promise(async resolve => {
      let resolved = false

      const server = await newHocuspocus({
        async beforeHandleAwareness({ awareness, states, connection }) {
          if (resolved) return
          resolved = true

          // The decoded states from the inbound update are exposed as a
          // mutable Map keyed by clientId. The document's own awareness has
          // not received the update yet.
          expect(states instanceof Map).toBe(true)
          expect(states.size > 0).toBe(true)
          expect(connection, 'connection is forwarded per call').toBeTruthy()
          expect(awareness.getStates().size).toBe(0)

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

  test('mutating states in beforeHandleAwareness rewrites the update before it is applied', async t => {
    await new Promise(async resolve => {
      let resolved = false

      const server = await newHocuspocus({
        async beforeHandleAwareness({ states }) {
          // Stamp a server-side value over whatever the client sent.
          for (const state of states.values()) {
            state.user = 'Verified'
          }
        },
        async onAwarenessUpdate({ states }) {
          const v = states.find(s => s.user === 'Verified' && s.foo === 'bar')
          if (resolved || !v) return
          resolved = true

          // Mutated value lands in awareness; original ('Spoofed') never appears.
          expect(v.user).toBe('Verified')
          expect(v.foo).toBe('bar')
          expect(states.find(s => s.user === 'Spoofed')).toBeFalsy()
          resolve('done')
        },
      })

      const provider = newHocuspocusProvider(server, {
        onConnect() {
          provider.setAwarenessField('user', 'Spoofed')
          provider.setAwarenessField('foo', 'bar')
        },
      })
    })
  })

  test('chaining: a second extension sees mutations made by the first', async t => {
    await new Promise(async resolve => {
      let resolved = false

      class FirstExtension {
        async beforeHandleAwareness({ states }: { states: Map<number, Record<string, any>> }) {
          for (const state of states.values()) {
            state.user = 'first'
          }
        }
      }

      class SecondExtension {
        async beforeHandleAwareness({ states }: { states: Map<number, Record<string, any>> }) {
          // Sees `first`'s mutation, appends to it.
          for (const state of states.values()) {
            expect(state.user, 'sees first extension mutation').toBe('first')
            state.user = `${state.user}-then-second`
          }
        }
      }

      const server = await newHocuspocus({
        extensions: [new FirstExtension(), new SecondExtension()],
        async onAwarenessUpdate({ states }) {
          const v = states.find(s => s.user === 'first-then-second')
          if (resolved || !v) return
          resolved = true

          // Both extension mutations made it through, in order.
          expect(v.user).toBe('first-then-second')
          resolve('done')
        },
      })

      const provider = newHocuspocusProvider(server, {
        onConnect() {
          provider.setAwarenessField('user', 'unchanged-by-client')
        },
      })
    })
  })

  test('chaining: extensions run before the config-level hook, in registration order', async t => {
    await new Promise(async resolve => {
      let resolved = false

      class ExtensionA {
        async beforeHandleAwareness({ states }: { states: Map<number, Record<string, any>> }) {
          for (const state of states.values()) {
            state.trail = `${state.trail ?? ''}A`
          }
        }
      }

      class ExtensionB {
        async beforeHandleAwareness({ states }: { states: Map<number, Record<string, any>> }) {
          for (const state of states.values()) {
            state.trail = `${state.trail ?? ''}B`
          }
        }
      }

      const server = await newHocuspocus({
        extensions: [new ExtensionA(), new ExtensionB()],
        async beforeHandleAwareness({ states }) {
          // Config-level hook is pushed onto `extensions` as the final entry by
          // `configure()`, so it runs AFTER both class extensions.
          for (const state of states.values()) {
            state.trail = `${state.trail ?? ''}C`
          }
        },
        async onAwarenessUpdate({ states }) {
          const v = states.find(s => s.trail === 'ABC')
          if (resolved || !v) return
          resolved = true

          expect(v.trail, 'extensions run first then the config-level hook').toBe('ABC')
          resolve('done')
        },
      })

      const provider = newHocuspocusProvider(server, {
        onConnect() {
          provider.setAwarenessField('init', true)
        },
      })
    })
  })

  test('throwing discards preceding extension mutations', async t => {
    await new Promise(async resolve => {
      let mutatorCalls = 0
      let throwerCalls = 0
      let onUpdateCalls = 0

      class MutatingExtension {
        async beforeHandleAwareness({ states }: { states: Map<number, Record<string, any>> }) {
          mutatorCalls += 1
          for (const state of states.values()) {
            state.user = 'first'
          }
        }
      }

      class ThrowingExtension {
        async beforeHandleAwareness() {
          throwerCalls += 1
          throw new Error('rejected')
        }
      }

      const server = await newHocuspocus({
        extensions: [new MutatingExtension(), new ThrowingExtension()],
        async onAwarenessUpdate({ states }) {
          if (states.length > 0) onUpdateCalls += 1
        },
      })

      const provider = newHocuspocusProvider(server, {
        onConnect() {
          provider.setAwarenessField('foo', 'bar')
        },
      })

      setTimeout(() => {
        expect(mutatorCalls >= 1, 'preceding extension fired').toBe(true)
        expect(throwerCalls >= 1, 'throwing extension fired').toBe(true)
        expect(onUpdateCalls, 'preceding mutations are not half-applied').toBe(0)
        resolve('done')
      }, 400)
    })
  })

  test('throwing aborts subsequent extensions and the config-level hook', async t => {
    await new Promise(async resolve => {
      let throwerCalls = 0
      let afterThrowerCalls = 0
      let configCalls = 0

      class ThrowingExtension {
        async beforeHandleAwareness() {
          throwerCalls += 1
          throw new Error('rejected')
        }
      }

      class AfterThrowerExtension {
        async beforeHandleAwareness() {
          afterThrowerCalls += 1
        }
      }

      const server = await newHocuspocus({
        extensions: [new ThrowingExtension(), new AfterThrowerExtension()],
        async beforeHandleAwareness() {
          configCalls += 1
        },
      })

      const provider = newHocuspocusProvider(server, {
        onConnect() {
          provider.setAwarenessField('foo', 'bar')
        },
      })

      setTimeout(() => {
        expect(throwerCalls >= 1, 'throwing extension fired').toBe(true)
        expect(afterThrowerCalls, 'extensions after the throw do not run').toBe(0)
        expect(configCalls, 'config-level hook does not run').toBe(0)
        resolve('done')
      }, 400)
    })
  })
})
