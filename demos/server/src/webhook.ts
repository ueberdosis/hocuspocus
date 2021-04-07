import { createServer } from 'http'
import { createHmac, timingSafeEqual } from 'crypto'
import { Logger } from '../../../packages/logger/src'
import { Server } from '../../../packages/server/src'
import { TiptapTransformer } from '../../../packages/transformer/src'
import { Events, Webhook } from '../../../packages/webhook/src'

/*
 * Setup server
 */
const server = Server.configure({
  port: 1234,
  throttle: false,

  extensions: [
    new Logger(),
    new Webhook({
      transformer: TiptapTransformer,
      secret: '1234',
      url: 'http://localhost:12345',
      events: [
        Events.Create, Events.Change,
      ],
    }),
  ],
})

server.listen()

/*
 * Setup receiver
 */
const secret = '1234'

// use this to verify the given payload and signature
const verifySignature = (body: string, header: string): boolean => {
  const signature = Buffer.from(header)

  const hmac = createHmac('sha256', secret)
  const digest = Buffer.from(`sha256=${hmac.update(body).digest('hex')}`)

  return signature.length !== digest.length || timingSafeEqual(digest, signature)
}

// create a simple http server to act as an webhook receiver
const receiver = createServer((request, response) => {
  let data = ''

  request.on('data', chunk => {
    data += chunk
  })

  request.on('end', () => {
    if (verifySignature(data, request.headers['x-hocuspocus-signature-256'] as string)) {
      // handle data
      console.log(`[${new Date().toISOString()}] Received "${request.url}":`, JSON.parse(data))
    } else {
      response.writeHead(403, 'signature not valid')
    }

    if (request.url === '/create') {
      response.writeHead(200, { 'Content-Type': 'application/json' })
      return response.end(JSON.stringify({
        default:
          {
            type: 'doc',
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    type: 'text',
                    text: 'What is love?',
                  },
                ],
              },
            ],
          },
      }))
    }

    response.end()
  })
})

receiver.listen(12345, () => {
  console.log(`[${new Date().toISOString()}] Receiver listening on port 12345`)
})
