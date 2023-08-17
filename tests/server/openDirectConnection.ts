import test from 'ava'
import * as Y from 'yjs'
import { TiptapTransformer } from '@hocuspocus/transformer'
import { newHocuspocus, newHocuspocusProvider, sleep } from '../utils'

test('direct connection prevents document from being removed from memory', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus()

    await server.openDirectConnection('hocuspocus-test')

    const provider = newHocuspocusProvider(server, {
      onSynced() {
        provider.configuration.websocketProvider.destroy()
        provider.destroy()

        sleep(server.configuration.debounce + 50).then(() => {
          t.is(server.getDocumentsCount(), 1)
          resolve('done')
        })
      },
    })
  })
})
test('direct connection works even if provider is connected', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus()

    const provider = newHocuspocusProvider(server, {
      onSynced() {
        provider.document.getMap('config').set('a', 'valueFromProvider')
      },
    })

    await sleep(100)

    const directConnection = await server.openDirectConnection('hocuspocus-test')
    await directConnection.transact(doc => {
      t.is('valueFromProvider', String(doc.getMap('config').get('a')))
      doc.getMap('config').set('b', 'valueFromServerDirectConnection')
    })

    await sleep(100)
    t.is('valueFromServerDirectConnection', String(provider.document.getMap('config').get('b')))

    resolve(1)
    t.pass()
  })
})

test('direct connection can apply yjsUpdate', async t => {
  await new Promise(async resolve => {
    const server = await newHocuspocus()

    const provider = newHocuspocusProvider(server)

    t.is('', provider.document.getXmlFragment('default').toJSON())

    const directConnection = await server.openDirectConnection('hocuspocus-test')
    await directConnection.transact(doc => {
      Y.applyUpdate(doc, Y.encodeStateAsUpdate(TiptapTransformer.toYdoc({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Example Paragraph',
              },
            ],
          },
        ],
      })))
    })

    await sleep(100)

    t.is('<paragraph>Example Paragraph</paragraph>', provider.document.getXmlFragment('default').toJSON())

    resolve(1)
    t.pass()
  })
})

test('direct connection can transact', async t => {
  const server = await newHocuspocus()

  const direct = await server.openDirectConnection('hocuspocus-test')

  await direct.transact(document => {
    document.getArray('test').insert(0, ['value'])
  })

  t.is(direct.document?.getArray('test').toJSON()[0], 'value')
})

test('direct connection cannot transact once closed', async t => {
  const server = await newHocuspocus()

  const direct = await server.openDirectConnection('hocuspocus-test')
  direct.disconnect()

  try {
    await direct.transact(document => {
      document.getArray('test').insert(0, ['value'])
    })
    t.fail('DirectConnection should throw an error when transacting on closed connection')
  } catch (err) {
    if (err instanceof Error && err.message === 'direct connection closed') {
      t.pass()
    } else {
      t.fail('unknown error')
    }
  }
})
