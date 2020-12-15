# Authentication
With the `onConnect` hook you can write a custom Promise to check if a client is authenticated. That can be a request to an API, to a microservice, a database query, or whatever is needed, as long as it’s executing `resolve()` at some point. You can also pass contextual data to the `resolve()` method which will be accessible in other hooks.

```js
import { Server } from '@hocuspocus/server'

const server = Server.configure({
  onConnect(data, resolve, reject) {
    const { requestHeaders, requestParameters } = data
    // Your code here, for example a request to an API

    // If the user is not authenticated …
    if (requestParameters.access_token !== 'super-secret-token') {
       return reject()
    }

    // Set contextual data
    const context = {
        user_id: 1234,
    }

    // If the user is authenticated …
    resolve(context)
  },
})

server.listen()
```
