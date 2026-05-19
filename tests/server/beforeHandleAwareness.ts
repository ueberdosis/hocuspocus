import test from 'ava'
import { newHocuspocus, newHocuspocusProvider } from '../utils/index.ts'

test('beforeHandleAwareness is called before the awareness state is applied', async t => {
  await new Promise(async resolve => {
    let resolved = false

    const server = await newHocuspocus(t, {
      async beforeHandleAwareness({ awareness, states, connection }) {
        if (resolved) return
        resolved = true

        // The decoded states from the inbound update are exposed as a
        // mutable Map keyed by clientId. The document's own awareness has
        // not received the update yet.
        t.true(states instanceof Map)
        t.true(states.size > 0)
        t.truthy(connection, 'connection is forwarded per call')
        t.is(awareness.getStates().size, 0)

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

test('mutating states in beforeHandleAwareness rewrites the update before it is applied', async t => {
  await new Promise(async resolve => {
    let resolved = false

    const server = await newHocuspocus(t, {
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
        t.is(v.user, 'Verified')
        t.is(v.foo, 'bar')
        t.falsy(states.find(s => s.user === 'Spoofed'))
        resolve('done')
      },
    })

    const provider = newHocuspocusProvider(t, server, {
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
          t.is(state.user, 'first', 'sees first extension mutation')
          state.user = `${state.user}-then-second`
        }
      }
    }

    const server = await newHocuspocus(t, {
      extensions: [new FirstExtension(), new SecondExtension()],
      async onAwarenessUpdate({ states }) {
        const v = states.find(s => s.user === 'first-then-second')
        if (resolved || !v) return
        resolved = true

        // Both extension mutations made it through, in order.
        t.is(v.user, 'first-then-second')
        resolve('done')
      },
    })

    const provider = newHocuspocusProvider(t, server, {
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

    const server = await newHocuspocus(t, {
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

        t.is(v.trail, 'ABC', 'extensions run first then the config-level hook')
        resolve('done')
      },
    })

    const provider = newHocuspocusProvider(t, server, {
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

    const server = await newHocuspocus(t, {
      extensions: [new MutatingExtension(), new ThrowingExtension()],
      async onAwarenessUpdate({ states }) {
        if (states.length > 0) onUpdateCalls += 1
      },
    })

    const provider = newHocuspocusProvider(t, server, {
      onConnect() {
        provider.setAwarenessField('foo', 'bar')
      },
    })

    setTimeout(() => {
      t.true(mutatorCalls >= 1, 'preceding extension fired')
      t.true(throwerCalls >= 1, 'throwing extension fired')
      t.is(onUpdateCalls, 0, 'preceding mutations are not half-applied')
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

    const server = await newHocuspocus(t, {
      extensions: [new ThrowingExtension(), new AfterThrowerExtension()],
      async beforeHandleAwareness() {
        configCalls += 1
      },
    })

    const provider = newHocuspocusProvider(t, server, {
      onConnect() {
        provider.setAwarenessField('foo', 'bar')
      },
    })

    setTimeout(() => {
      t.true(throwerCalls >= 1, 'throwing extension fired')
      t.is(afterThrowerCalls, 0, 'extensions after the throw do not run')
      t.is(configCalls, 0, 'config-level hook does not run')
      resolve('done')
    }, 400)
  })
})
