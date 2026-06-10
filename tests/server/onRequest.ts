import test from 'ava'
import type { onRequestPayload } from '@hocuspocus/server'
import { newHocuspocus } from '../utils/index.ts'

test('executes the onRequest callback', async t => {
  await new Promise(async resolve => {
    const hocuspocus = await newHocuspocus(t, {
      async onRequest({ request }: onRequestPayload) {
        t.is(request.url, '/foobar')

        resolve('done')
      },
    })

    fetch(`${hocuspocus.server!.httpURL}/foobar`).catch(() => {})
  })
})

test('executes the onRequest callback of a custom extension', async t => {
  await new Promise(async resolve => {
    class CustomExtension {
      async onRequest({ response }: onRequestPayload) {
        return new Promise((resolve, reject) => {

          response.writeHead(200, { 'Content-Type': 'text/plain' })
          response.end('I like cats.')

          return reject()
        })
      }
    }

    const hocuspocus = await newHocuspocus(t, {
      extensions: [
        new CustomExtension(),
      ],
    })

    const response = await fetch(hocuspocus.server!.httpURL)
    t.is(await response.text(), 'I like cats.')
    resolve('done')
  })
})

test('can intercept specific URLs', async t => {
  await new Promise(async resolve => {
    const hocuspocus = await newHocuspocus(t, {
      async onRequest({ response, request }: onRequestPayload) {
        if (request.url === '/foobar') {
          return new Promise((resolve, reject) => {

            response.writeHead(200, { 'Content-Type': 'text/plain' })
            response.end('I like cats.')

            return reject()
          })
        }
      },
    })

    const interceptedResponse = await fetch(`${hocuspocus.server!.httpURL}/foobar`)
    t.is(await interceptedResponse.text(), 'I like cats.')

    const regularResponse = await fetch(hocuspocus.server!.httpURL)
    t.is(await regularResponse.text(), 'Welcome to Hocuspocus!')
    resolve('done')
  })
})

test('has the instance', async t => {
  await new Promise(async resolve => {
    const hocuspocus = await newHocuspocus(t, {
      async onRequest({ instance }) {
        t.is(instance, hocuspocus)
        resolve('done')
      },
    })

    fetch(`${hocuspocus.server!.httpURL}/foobar`).catch(() => {})
  })
})
