import { getDocumentNamePayload } from '@hocuspocus/server'
import test from 'ava'
import { newHocuspocus, newHocuspocusProvider, sleep } from '../utils'

test('prefixes the document name', async t => {
  await new Promise(resolve => {
    const server = newHocuspocus({
      getDocumentName({ request }) {
        const documentNameFromRequest = decodeURI(
          request.url?.slice(1)?.split('?')[0] || '',
        )

        return `prefix-${documentNameFromRequest}`
      },
      async onConnect({ documentName }) {
        t.is(documentName, 'prefix-hocuspocus-test')

        resolve('done')
      },
    })

    newHocuspocusProvider(server)
  })
})

test('prefixes the document name based on the request', async t => {
  await new Promise(resolve => {
    const server = newHocuspocus({
      getDocumentName({ request, requestParameters }) {
        const documentNameFromRequest = decodeURI(
          request.url?.slice(1)?.split('?')[0] || '',
        )

        return `${requestParameters.get('prefix')}-${documentNameFromRequest}`
      },
      async onConnect({ documentName }) {
        t.is(documentName, 'prefix-hocuspocus-test')

        resolve('done')
      },
    })

    newHocuspocusProvider(server, {
      parameters: {
        prefix: 'prefix',
      },
    })
  })
})

test('prefixes the document name with an async function', async t => {
  await new Promise(resolve => {
    const server = newHocuspocus({
      async getDocumentName({ request }: getDocumentNamePayload) {
        const prefix = await new Promise(resolve => setTimeout(() => {
          return resolve('prefix')
        }, 50))

        const documentNameFromRequest = decodeURI(
          request.url?.slice(1)?.split('?')[0] || '',
        )

        return `${prefix}-${documentNameFromRequest}`
      },
      async onConnect({ documentName }) {
        t.is(documentName, 'prefix-hocuspocus-test')

        resolve('done')
      },
    })

    newHocuspocusProvider(server, {
      parameters: {
        prefix: 'prefix',
      },
    })
  })
})
