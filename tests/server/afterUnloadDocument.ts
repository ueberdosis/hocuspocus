import test from 'ava'
import type { HocuspocusProvider } from '@hocuspocus/provider'

import { newHocuspocus, newHocuspocusProvider } from '../utils/index.js'

test('executes the afterUnloadDocument callback', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus({
      async afterUnloadDocument() {
        t.pass()
        resolve('done')
      },
    })

    const p = newHocuspocusProvider(server, {
      onSynced(data) {
        p.configuration.websocketProvider.disconnect()
        p.disconnect()
      },
    })
  })
})

test('executes the afterUnloadDocument callback when all clients disconnect after a document was loaded', async t => {
  await new Promise(async resolve => {
    let provider: HocuspocusProvider

    class CustomExtension {
      async afterLoadDocument() {
        provider.configuration.websocketProvider.disconnect()
        provider.disconnect()
      }

      async afterUnloadDocument() {
        t.pass()
        resolve('done')
      }
    }

    const server = await newHocuspocus({
      extensions: [new CustomExtension()],
    })

    provider = newHocuspocusProvider(server)
  })
})

test('executes the afterUnloadDocument callback when document fails to load', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus()

    class CustomExtension {
      async onLoadDocument() {
        throw new Error('oops!')
      }

      async afterUnloadDocument() {
        t.pass()
        resolve('done')
      }
    }

    server.configure({
      extensions: [
        new CustomExtension(),
      ],
    })

    newHocuspocusProvider(server)
  })
})
