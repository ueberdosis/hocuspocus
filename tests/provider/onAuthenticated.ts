import test from 'ava'
import { newHocuspocus, newHocuspocusProvider } from '../utils'

test('executes the onAuthenticated callback', async t => {
  await new Promise(resolve => {
    const server = newHocuspocus({
      async onAuthenticate({ token }) {
        if (token !== 'SUPER-SECRET-TOKEN') {
          throw new Error()
        }
      },
    })

    newHocuspocusProvider(server, {
      token: 'SUPER-SECRET-TOKEN',
      onAuthenticated() {
        t.pass()
        resolve('done')
      },
    })
  })
})

test('executes the onAuthenticated callback when token is provided as a function that returns a promise', async t => {
  await new Promise(resolve => {
    const server = newHocuspocus({
      async onAuthenticate({ token }) {
        if (token !== 'SUPER-SECRET-TOKEN') {
          throw new Error()
        }
      },
    })

    newHocuspocusProvider(server, {
      token: async () => Promise.resolve('SUPER-SECRET-TOKEN'),
      onAuthenticated() {
        t.pass()
        resolve('done')
      },
    })
  })
})

test('executes the onAuthenticated callback when token is provided as a function that returns a string', async t => {
  await new Promise(resolve => {
    const server = newHocuspocus({
      async onAuthenticate({ token }) {
        if (token !== 'SUPER-SECRET-TOKEN') {
          throw new Error()
        }
      },
    })

    newHocuspocusProvider(server, {
      token: () => 'SUPER-SECRET-TOKEN',
      onAuthenticated() {
        t.pass()
        resolve('done')
      },
    })
  })
})
