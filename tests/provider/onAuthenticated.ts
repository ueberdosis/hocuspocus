import test from 'ava'
import { newHocuspocus, newHocuspocusProvider } from '../utils/index.js'

test('executes the onAuthenticated callback', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus({
      async onAuthenticate({ token }) {
        if (token !== 'SUPER-SECRET-TOKEN') {
          throw new Error()
        }
      },
    })

    const provider = newHocuspocusProvider(server, {
      token: 'SUPER-SECRET-TOKEN',
      onAuthenticated() {
        t.is(provider.isAuthenticated, true)
        t.is(provider.authorizedScope, 'read-write')
        t.pass()
        resolve('done')
      },
    })
  })
})

test('executes the onAuthenticated callback when token is provided as a function that returns a promise', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus({
      async onAuthenticate({ token }) {
        if (token !== 'SUPER-SECRET-TOKEN') {
          throw new Error()
        }
      },
    })

    const provider = newHocuspocusProvider(server, {
      token: async () => Promise.resolve('SUPER-SECRET-TOKEN'),
      onAuthenticated() {
        t.is(provider.isAuthenticated, true)
        t.is(provider.authorizedScope, 'read-write')
        t.pass()
        resolve('done')
      },
    })
  })
})

test('executes the onAuthenticated callback when token is provided as a function that returns a string', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus({
      async onAuthenticate({ token }) {
        if (token !== 'SUPER-SECRET-TOKEN') {
          throw new Error()
        }
      },
    })

    const provider = newHocuspocusProvider(server, {
      token: () => 'SUPER-SECRET-TOKEN',
      onAuthenticated() {
        t.is(provider.isAuthenticated, true)
        t.is(provider.authorizedScope, 'read-write')
        t.pass()
        resolve('done')
      },
    })
  })
})

test('sets correct scope for readonly', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus({
      async onAuthenticate({ token, connection }) {
        if (token !== 'SUPER-SECRET-TOKEN') {
          throw new Error()
        }
        connection.readOnly = true
      },
    })

    const provider = newHocuspocusProvider(server, {
      token: 'SUPER-SECRET-TOKEN',
      onAuthenticated() {
        t.is(provider.isAuthenticated, true)
        t.is(provider.authorizedScope, 'readonly')
        t.pass()
        resolve('done')
      },
    })
  })
})
