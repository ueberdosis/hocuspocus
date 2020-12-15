# Export
To pass the updated documents to an API, or to a database, you can use the `onChange` hook, which is executed when a document changes. With the `debounce` setting you can slow down the execution, with the `debounceMaxWait` setting you can make sure the content is sent at least every few seconds:

```js
import { Server } from '@hocuspocus/server'

const server = Server.configure({
  // time to wait before sending changes (in milliseconds)
  debounce: 2000,

  // maximum time to wait (in milliseconds)
  debounceMaxWait: 10000,

  // executed when the document is changed
  onChange(data) {
    const {
      clientsCount,
      document,
      documentName,
      requestHeaders,
      requestParameters,
    } = data

    // Your code here, for example a request to an API
  },
})

server.listen()
```

There is no method to restore documents from an external source, so you’ll need a [persistence driver](#persist-the-document) though. Those persistence drivers store every change to the document. That’s probably not needed in your external source, but is needed to make the merging of changes conflict-free in the collaborative editing backend.
