# Authentication & Authorization

## toc

## Introducing hooks

hocuspocus offers hooks to extend it's functionality and integrate it into existing applications. Hooks are configured as simple methods the same way as [other configuration options](/guide/configuration) are.

Hooks accept a hook payload as first argument. The payload is an object that contains data you can use and manipulate, allowing you to built complex things on top of this simple mechanic. Some hooks also give you `resolve()` and `reject()` methods as second and third argument. You probably heard of them if you worked with [Promises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) before. Those allow you to react to a hook and for example terminate a connection if the user isn't authenticated.

## Authorizing & authenticating requests

With the `onConnect` hook you can check if a client is authenticated and authorized to view the current document. In a real world application this would probably be a request to an API, a database query or something else.

When the user is authorized, call the `resolve()` method. Calling `reject()` on the other hand will terminate the connection. You can also pass contextual data to `resolve()` which will be accessible in other hooks.

For more information on the hook and it's payload checkout it's [API section](/api/on-connect).

```typescript
import { Server } from '@hocuspocus/server'

const server = Server.configure({
  onConnect(data, resolve, reject) {
    const { requestParameters } = data

    // Example test if a user is authenticated using a
    // request parameter
    if (requestParameters.access_token !== 'super-secret-token') {
      return reject()
    }

    // You can set contextual data…
    const context = {
      user: {
        id: 1234,
        name: 'John',
      },
    }

    // …and pass it along to use it in other hooks
    resolve(context)
  },
})

server.listen()
```
