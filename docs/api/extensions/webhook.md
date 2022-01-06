---
tableOfContents: true
---

# Webhook

## Introduction

The webhook extension allows you to connect Hocuspocus to your existing application by triggering webhooks on certain events.

## Installation

Install the Webhook package with:

```bash
npm install @hocuspocus/extension-webhook
```

## Configuration

```js
import { Server } from '@hocuspocus/server'
import { Webhook, Events } from '@hocuspocus/extension-webhook'
import { TiptapTransformer } from '@hocuspocus/transformer'

const server = Server.configure({
  extensions: [
    new Webhook({
      // [required] url of your application
      url: 'https://example.com/api/hocuspocus',

      // [required] a random string that will be used to verify the request signature
      secret: '459824aaffa928e05f5b1caec411ae5f',

      // [required] a transformer for your document
      transformer: TiptapTransformer,

      // [optional] array of events that will trigger a webhook
      // defaults to [ Events.onChange ]
      events: [
        Events.onConnect, Events.onCreate, Events.onChange, Events.onDisconnect,
      ],

      // [optional] time in ms the change event should be debounced,
      // defaults to 2000
      debounce: 2000,

      // [optional] time in ms after that the webhook will be sent
      // regardless of the configured debouncing, defaults to 10000
      debounceMaxWait: 10000,
    }),
  ],
})

server.listen()
```

## How it works

The webhook extension listens on up to four configurable events/hooks that will trigger a POST request to the configured url.

### onConnect

When a new user connects to the server, the onConnect webhook will be triggered with the following payload:

```json
{
  "event": "connect",
  "payload": {
    "documentName": "example-document",
    "requestHeaders": {
      "Example-Header": "Example"
    },
    "requestParameters": {
      "example": "12345"
    }
  }
}
```

You can use this to authorize your users. By responding with a 403 status code the user is not authorized and the connection will be terminated. You can respond with a JSON payload that will be set as context throughout the rest of the application. For example:

```js
// authorize the user by the request parameters or headers
if (payload.requestParameters?.get('token') !== "secret-api-token") {
  response.writeHead(403, 'unathorized')
  return response.end()
}

// return context if authorized
response.writeHead(200, { 'Content-Type': 'application/json' })
response.end(JSON.stringify({
  user: {
    id: 1,
    name: 'Jane Doe',
  },
}))
```

### onCreate

When a new document is created the onCreate webhook will be triggered with the following payload:

```json
{
  "event": "create",
  "payload": {
    "documentName": "example-document"
  }
}
```

You can use this to import a document into Hocuspocus. The webhook extension will first load the document from the [primary storage](/guide/documents#using-a-primary-storage) and only import it if it doesn't already exist in there.

Just respond with all the single documents keyed by their field name. For example:

```js
response.writeHead(200, { 'Content-Type': 'application/json' })
response.end(JSON.stringify({
  // Document for the "secondary" field
  secondary: {},
  // Document for the "default" field
  default: {
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
```

### onChange

When a document is changed the onChange webhook will be triggered with the following payload including the context you set before:

```json
{
  "event": "change",
  "payload": {
    "documentName": "example-document",
    "document": {
      "another-field-name": {},
      "field-name": {
        "type": "doc",
        "content": [
          {
            "type": "paragraph",
            "content": [
              {
                "type": "text",
                "text": "What is love?"
              }
            ]
          }
        ]
      }
    },
    "context": {
      "user_id": 1,
      "name": "Jane Doe"
    }
  }
}
```

Because this happens on every keystroke up to multiple times a second, the webhook is debounced by default. You can configure this (or shut it off entirely) with the `debounce` and `debounceMaxWait` configuration options.

### onDisconnect

When a user disconnects the onDisconnect webhook will be triggered with the following payload:

```json
{
  "event": "disconnect",
  "payload": {
    "documentName": "example-document",
    "context": {
      "user_id": 1,
      "name": "Jane Doe"
    }
  }
}
```

## Transformation

As you probably already know from [the guide](/guide/transformations) the Y-Doc must be serialized into something readable by your application and when importing a document it must be converted into a Y-Doc respectively.

Because Hocuspocus doesn't know how your data is structured, you need to pass a transformer to the Webhook extension. You can use one of the transformers from the `@hocuspocus/transformer` package. Make sure to configure them properly. In this example we used the TiptapTransformer that needs the list of extensions:

```js
import { Server } from '@hocuspocus/server'
import { Webhook } from '@hocuspocus/extension-webhook'
import { TiptapTransformer } from '@hocuspocus/extension-transformer'
import Document from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'

const server = Server.configure({
  extensions: [
    new Webhook({
      url: 'https://example.com/api/webhook',
      secret: '459824aaffa928e05f5b1caec411ae5f',

      transformer: TiptapTransformer.extensions([ Document, Paragraph, Text ])
    }),
  ],
})

server.listen()
```
Alternatively you can write your own implementation by simply passing functions that convert a Y-Doc to your representation and vice versa:

```js
import { Server } from '@hocuspocus/server'
import { Webhook } from '@hocuspocus/extension-webhook'
import { Doc } from 'yjs'

const server = Server.configure({
  extensions: [
    new Webhook({
      url: 'https://example.com/api/webhook',
      secret: '459824aaffa928e05f5b1caec411ae5f',

      transformer: {
        toYdoc(document: any, fieldName: string): Doc {
          // convert the given document (from your api) to a ydoc using the provided fieldName
          return new Doc()
        },
        fromYdoc(document: Doc): any {
          // convert the ydoc to your representation
          return document.toJSON()
        },
      }
    }),
  ],
})

server.listen()
```

## Verify Request Signature

On your application server you should verify the signature coming from the webhook extension to secure the route.

The extension sends POST requests, and the signature is stored in the `X-Hocuspocus-Signature-256` header containing a message authentication code created with sha256.

Here are some examples how you could do that in different languages:

### PHP

```php
use Symfony\Component\HttpFoundation\Request;

function verifySignature(Request $request) {
  $secret = '459824aaffa928e05f5b1caec411ae5f';

  if (($signature = $request->headers->get('X-Hocuspocus-Signature-256')) == null) {
      throw new Exception('Header not set');
  }

  $parts = explode('=', $signature);

  if (count($parts) != 2) {
      throw new Exception('Invalid signature format');
  }

  $digest = hash_hmac('sha256', $request->getContent(), $secret);

  return hash_equals($digest, $parts[1]);
}

```

### JavaScript

```js
import { IncomingMessage } from 'http'

const secret = '459824aaffa928e05f5b1caec411ae5f'

const verifySignature = (request: IncomingMessage): boolean => {
  const signature = Buffer.from(request.headers['x-hocuspocus-signature-256'] as string)

  const hmac = createHmac('sha256', secret)
  const digest = Buffer.from(`sha256=${hmac.update(body).digest('hex')}`)

  return signature.length !== digest.length || timingSafeEqual(digest, signature)
}
```
