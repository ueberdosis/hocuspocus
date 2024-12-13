import test from 'ava'
import type { Hocuspocus } from '@hocuspocus/server'
import { newHocuspocus, newHocuspocusProvider } from '../utils/index.js'

test('onConfigure callback is executed', async t => {
  await new Promise(async resolve => {
    let givenInstance = null

    const server = await newHocuspocus({
      async onConfigure({ instance }) {
        givenInstance = instance
      },
    })

    t.is(givenInstance as unknown as Hocuspocus, server)
    resolve('done')
  })
})

test('executes onConfigure callback from an extension', async t => {
  await new Promise(async resolve => {
    class CustomExtension {
      async onConfigure() {
        t.pass()
        resolve('done')
      }
    }

    const server = await newHocuspocus({
      extensions: [
        new CustomExtension(),
      ],
    })

    newHocuspocusProvider(server)
  })
})

test('has the configuration', async t => {
  await new Promise(async resolve => {
    newHocuspocus({
      debounce: 2001,
      async onConfigure({ configuration }) {
        t.is(configuration.debounce, 2001)

        resolve('done')
      },
    })
  })
})

test('has the version', async t => {
  await new Promise(async resolve => {
    newHocuspocus({
      async onConfigure({ version }) {
        t.truthy(version)

        resolve('done')
      },
    })
  })
})
