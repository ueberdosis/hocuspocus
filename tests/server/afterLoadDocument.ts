import test from 'ava'
import { HocuspocusProvider } from '@hocuspocus/provider'

import { newHocuspocus, newHocuspocusProvider, sleep } from '../utils/index.js'

test('executes the afterLoadDocument callback', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus({
      async afterLoadDocument() {
        t.pass()
        resolve('done')
      },
    })

    newHocuspocusProvider(server, {})
  })
})

test('executes the afterLoadDocument callback in an extension', async t => {
  await new Promise(async resolve => {
    let provider: HocuspocusProvider

    class CustomExtension {
      async afterLoadDocument() {
        t.pass()
        resolve('done')
      }
    }

    const server = await newHocuspocus({
      extensions: [new CustomExtension()],
    })

    newHocuspocusProvider(server)
  })
})

test('does not execute the afterLoadDocument callback when document fails to load', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus()

    class CustomExtension {
      async onLoadDocument() {
        throw new Error('oops!')
      }

      async afterLoadDocument() {
        t.fail('this should not be executed')
        resolve('done')
      }
    }

    server.configure({
      extensions: [
        new CustomExtension(),
      ],
    })

    newHocuspocusProvider(server)

    await sleep(300)
    t.pass()
    resolve('')
  })
})
