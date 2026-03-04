import test from 'ava'
import { newHocuspocus, newHocuspocusProvider } from '../utils/index.ts'

test('executes the onUpgrade callback', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus(t, {
      async onUpgrade() {
        t.pass()
        resolve('done')
      },
    })

    newHocuspocusProvider(t, server)
  })
})

test('executes the onUpgrade callback from an extension', async t => {
  await new Promise(async resolve => {
    class CustomExtension {
      async onUpgrade() {
        t.pass()
        resolve('done')
      }
    }

    const server = await newHocuspocus(t, {
      extensions: [
        new CustomExtension(),
      ],
    })

    newHocuspocusProvider(t, server)
  })
})

test('has the server instance', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus(t, {

      async onUpgrade({ instance }) {
        t.is(instance, server)
        resolve('done')
      },
    })

    newHocuspocusProvider(t, server)
  })
})

test('has the request', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus(t, {

      async onUpgrade({ request }) {
        t.is(request.url, '/')
        resolve('done')
      },
    })

    newHocuspocusProvider(t, server)
  })
})

test('has the socket', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus(t, {

      async onUpgrade({ socket }) {
        t.truthy(socket)
        resolve('done')
      },
    })

    newHocuspocusProvider(t, server)
  })
})

test('has the head', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus(t, {

      async onUpgrade({ head }) {
        t.truthy(head)
        resolve('done')
      },
    })

    newHocuspocusProvider(t, server)
  })
})
