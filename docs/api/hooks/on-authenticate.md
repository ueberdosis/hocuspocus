---
tableOfContents: true
---

# onAuthenticate

## Introduction
The `onAuthenticate` hook will be called when the server receives an authentication request from the client provider. It should return a Promise. Throwing an exception or rejecting the Promise will terminate the connection.

## Hook payload
The `data` passed to the `onAuthenticate` hook has the following attributes:

```js
import { IncomingHttpHeaders } from 'http'
import { URLSearchParams } from 'url'
import { Doc } from 'yjs'

const data = {
  documentName: string,
  instance: Hocuspocus,
  requestHeaders: IncomingHttpHeaders,
  requestParameters: URLSearchParams,
  socketId: string,
  token: string,
  connection: {
    readOnly: boolean,
  },
}
```

## Example
```js
import { Server } from '@hocuspocus/server'

const server = Server.configure({
  async onAuthenticate(data) {
    const { token } = data

    // Example test if a user is authenticated using a
    // request parameter
    if (token !== 'super-secret-token') {
      throw new Error('Not authorized!')
    }

    // Example to set a document to read only for the current user
    // thus changes will not be accepted and synced to other clients
    if (someCondition === true) {
      data.connection.readOnly = true
    }

    // You can set contextual data to use it in other hooks
    return {
      user: {
        id: 1234,
        name: 'John',
      },
    }
  },
})

server.listen()
```

### Disabling authentication for some users
Once the `onAuthenticate` hook is configured, the server will wait for the authentication WebSocket message. If you want to override that behaviour (for some users), you can manually do that in the `onConnect` hook.

```js
import { Server } from '@hocuspocus/server'

const server = Server.configure({
  async onConnect({ connection }) {
    connection.requiresAuthentication = false
  },
  async onAuthenticate() {
    // Danger! This won’t be called for that connection attempt.
  },
}).listen()
```
