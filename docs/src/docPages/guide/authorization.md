# Authorization
With the `onJoinDocument` hook you can check if a user is authorized to edit the current document. This works in the same way the [Authentication](#authentication) works.

```js
import { Server } from '@hocuspocus/server'

const server = Server.configure({
  onJoinDocument(data, resolve, reject) {
    const {
      clientsCount,
      context,
      document,
      documentName,
      requestHeaders,
      requestParameters,
    } = data
    // Your code here, for example a request to an API

    // Access the contextual data from the onConnect hook, in this example this will print { user_id: 1234 }
    console.log(context)

    // If the user is authorized …
    resolve()

    // if the user isn’t authorized …
    reject()
  },
})

server.listen()
```
