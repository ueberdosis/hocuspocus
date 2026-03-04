import test from 'ava'
import type { HocuspocusProvider } from '@hocuspocus/provider'

import { newHocuspocus, newHocuspocusProvider, sleep } from '../utils/index.ts'

test('executes the afterLoadDocument callback', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus(t, {
      async afterLoadDocument() {
        t.pass()
        resolve('done')
      },
    })

    newHocuspocusProvider(t, server, {})
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

    const server = await newHocuspocus(t, {
      extensions: [new CustomExtension()],
    })

    newHocuspocusProvider(t, server)
  })
})

test('does not execute the afterLoadDocument callback when document fails to load', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus(t)

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

    newHocuspocusProvider(t, server)

    await sleep(300)
    t.pass()
    resolve('')
  })
})
