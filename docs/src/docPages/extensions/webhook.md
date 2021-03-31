# Webhook

## toc

## Introduction

The webhook extension allows you to send documents via webhook to the API of your choice when they are changed. This is a very simple way to add hocuspocus to your existing application, even if it isn't built with Node.js.

## Installation

Configure your `.npmrc` to look for packages with the @hocuspocus prefix in our private registry, [as described here](/installation#2-installation).

Now you should be able to install the Monitor package with:

```bash
# with npm
npm install @hocuspocus/extension-webhook

# with Yarn
yarn add @hocuspocus/extension-webhook
```

## Configuration

```js
import { Server } from '@hocuspocus/server'
import { Webhook } from '@hocuspocus/extension-webhook'
import { TiptapTransformer } from '@hocuspocus/transformer'

const server = Server.configure({
  extensions: [
    new Webhook({
      // [required] array of urls to send the webhook too
      urls: [ 'https://example.com/webhook', 'https://mirror.example.com' ],

      // [required] a random string that will be used to verify the request signature
      secret: '459824aaffa928e05f5b1caec411ae5f',

      // [required] a transformer for your document
      transformer: TiptapTransformer,

      // [optional] time in ms the webhook should be debounced, defaults to 2000
      debounce: 2000,

      // [optional] time in ms after that the webhook will be sent
      // regardless of debouncing, defaults to 10000
      debounceMaxWait: 10000,
    }),
  ],
})

server.listen()
```

## Transformation

As you probably already know from [the guide](/guide/documents), all hooks gives you access to the Y-Doc which must be serialized into something readable by your application.

Because hocuspocus doesn't know how your data is structured, you need to pass a transformer to the Webhook extension. You can use a Transformer from the `@hocuspocus/transformer` package, or write your own by simply passing a function that accepts a Y-Doc and returns your representation:

```typescript
import { Server } from '@hocuspocus/server'
import { Webhook } from '@hocuspocus/extension-webhook'
import { Doc } from 'yjs'

const server = Server.configure({
  extensions: [
    new Webhook({
      urls: [ 'https://example.com/webhook' ],
      secret: '459824aaffa928e05f5b1caec411ae5f',

      transformer: (document: Doc): any => {
          // convert the given y-doc to something and return it!
          return {}
      },
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

```typescript
import { IncomingMessage } from 'http'

const secret = '459824aaffa928e05f5b1caec411ae5f'

const verifySignature = (request: IncomingMessage): boolean => {
  const signature = Buffer.from(request.headers['x-hocuspocus-signature-256'] as string)

  const hmac = createHmac('sha256', secret)
  const digest = Buffer.from(`sha256=${hmac.update(body).digest('hex')}`)

  return signature.length !== digest.length || timingSafeEqual(digest, signature)
}
```
