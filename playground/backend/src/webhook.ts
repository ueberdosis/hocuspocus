import {
  createServer, IncomingMessage, ServerResponse, Server as HTTPServer,
} from 'http'
import { createHmac, timingSafeEqual } from 'crypto'
import { Server } from '@hocuspocus/server'
import { Logger } from '@hocuspocus/extension-logger'
import { TiptapTransformer } from '@hocuspocus/transformer'
import { Events, Webhook } from '@hocuspocus/extension-webhook'

/*
 * Setup server
 */
const server = Server.configure({
  port: 1234,
  extensions: [
    new Logger(),
    new Webhook({
      transformer: TiptapTransformer,
      secret: '1234',
      url: 'http://localhost:12345',
      events: [
        Events.onCreate, Events.onChange, Events.onConnect,
      ],
    }),
  ],
})

server.listen()

/*
 * Setup receiver
 */
class WebhookReceiver {

  secret = '1234'

  apiToken = '123456'

  server: HTTPServer

  constructor() {
    this.server = createServer(this.handleRequest.bind(this))

    this.server.listen(12345, () => {
      console.log('[WebhookReceiver] listening on port 12345…')
    })
  }

  verifySignature(body: string, header: string): boolean {
    const signature = Buffer.from(header)

    const hmac = createHmac('sha256', this.secret)
    const digest = Buffer.from(`sha256=${hmac.update(body).digest('hex')}`)

    return signature.length !== digest.length || timingSafeEqual(digest, signature)
  }

  handleRequest(request: IncomingMessage, response: ServerResponse) {
    let data = ''

    request.on('data', chunk => {
      data += chunk
    })

    request.on('end', () => {
      if (!this.verifySignature(data, <string> request.headers['x-hocuspocus-signature-256'])) {
        response.writeHead(403, 'signature not valid')
      }

      const { event, payload } = <{ event: string, payload: any }> JSON.parse(data)

      try {
        // @ts-ignore - let me do some magic here please TypeScript
        this[`on${event[0].toUpperCase()}${event.substr(1)}`](payload, response)
      } catch (e) {
        console.log(`[WebhookReceiver] unknown event "${event}"`)
      }
    })
  }

  onConnect(payload: any, response: ServerResponse) {
    console.log(`[WebhookReceiver] user connected to ${payload.documentName}`)

    // authorize user
    if (payload.requestParameters?.token !== this.apiToken) {
      response.writeHead(403, 'unathorized')
      return response.end()
    }

    // return context
    response.writeHead(200, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify({
      user: {
        id: 1,
        name: 'John',
      },
    }))
  }

  onCreate(payload: any, response: ServerResponse) {
    console.log(`[WebhookReceiver] document ${payload.documentName} created`)

    // return a document for the "default" field
    response.writeHead(200, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify({
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

  onChange(payload: any, response: ServerResponse) {
    console.log(`[WebhookReceiver] document ${payload.documentName} was changed: ${JSON.stringify(payload.document)}`)
  }

  onDisconnect(payload: any, response: ServerResponse) {
    console.log(`[WebhookReceiver] user ${payload.context.user.name} disconnected from ${payload.documentName}`)
  }
}

const receiver = new WebhookReceiver()
