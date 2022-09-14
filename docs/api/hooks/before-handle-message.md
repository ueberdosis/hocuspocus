---
tableOfContents: true
---

# onChange

## Introduction

The `beforeHandleMessage` hook is called when a message was received by the server, directly before
handling/applying it. The hook can be used to reject a message (e.g. if the authentication token has
expired), or even to check the update message and reject / accept it based on custom rules. If you
throw an error in the hook, the connection will be closed. You can return a custom code / reason by
throwing an error that implements CloseEvent (see example below).

## Hook payload

The `data` passed to the `beforeHandleMessage` hook has the following attributes:

```js
import {IncomingHttpHeaders} from 'http'
import {URLSearchParams} from 'url'
import {Doc} from 'yjs'
import {CloseEvent} from '@hocuspocus/common'

const data = {
  clientsCount: number,
  context: any,
  document: Doc,
  documentName: string,
  instance: Hocuspocus,
  requestHeaders: IncomingHttpHeaders,
  requestParameters: URLSearchParams,
  update: Uint8Array,
  socketId: string,
}
```

Context contains the data provided in former `onConnect` hooks.

## Example

```js
import {debounce} from 'debounce'
import {Server} from '@hocuspocus/server'
import {TiptapTransformer} from '@hocuspocus/transformer'
import {writeFile} from 'fs'

let debounced

const server = Server.configure({
  beforeHandleMessage(data) {
    if (data.context.tokenExpiresAt <= new Date()) {
      const error: CloseEvent = {
        reason: 'Token expired'
      }

      throw error;
    }
  },
})

server.listen()
```
