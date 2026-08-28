import { describe, expect, test } from 'vite-plus/test'

import type { onRequestPayload } from '@hocuspocus/server'
import { newHocuspocus } from '../utils/index.ts'

describe('onRequest', () => {
  test('executes the onRequest callback', async t => {
    await new Promise(async resolve => {
      const hocuspocus = await newHocuspocus({
        async onRequest({ request }: onRequestPayload) {
          expect(request.url).toBe('/foobar')

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

      const hocuspocus = await newHocuspocus({
        extensions: [new CustomExtension()],
      })

      const response = await fetch(hocuspocus.server!.httpURL)
      expect(await response.text()).toBe('I like cats.')
      resolve('done')
    })
  })

  test('can intercept specific URLs', async t => {
    await new Promise(async resolve => {
      const hocuspocus = await newHocuspocus({
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
      expect(await interceptedResponse.text()).toBe('I like cats.')

      const regularResponse = await fetch(hocuspocus.server!.httpURL)
      expect(await regularResponse.text()).toBe('Welcome to Hocuspocus!')
      resolve('done')
    })
  })

  test('has the instance', async t => {
    await new Promise(async resolve => {
      const hocuspocus = await newHocuspocus({
        async onRequest({ instance }) {
          expect(instance).toBe(hocuspocus)
          resolve('done')
        },
      })

      fetch(`${hocuspocus.server!.httpURL}/foobar`).catch(() => {})
    })
  })
})
