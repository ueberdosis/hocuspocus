# Configuration

## toc

## Introduction
Pass a single object with all your custom settings to the provider and you’re good to go.

## Configure the provider
There is not much required to set up the provider, here is how a minimal setup should look like:

```js
const ydoc = new Y.Doc()

const provider = new HocuspocusProvider({
  url: 'ws://127.0.0.1:1234',
  name: 'example-document',
  document: ydoc,
  // …
})
```

## List of settings
There is definitely more to configure. Find the full list of all available settings below.

| Name                    | Default           | Description                                                                                                                                                                        |
| ----------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| url                     | `''`              | The URL of the hocuspocus/WebSocket server.                                                                                                                                        |
| parameters              | `{}`              | Parameters will be added to the server URL and passed to the server.                                                                                                               |
| name                    | `''`              | The name of the document.                                                                                                                                                          |
| document                | `''`              | The actual Y.js document.                                                                                                                                                          |
| token                   | `''`              | An authentication token that will be passed to the server (works with strings, functions and Promises).                                                                            |
| awareness               | `new Awareness()` | Awareness object, by default attached to the passed Y.js document.                                                                                                                 |
| connect                 | `true`            | Whether to connect to the server after intialization.                                                                                                                              |
| broadcast               | `true`            | By default changes are synced between browser tabs through broadcasting.                                                                                                           |
| forceSyncInterval       | `false`           | Ask the server every x ms for updates.                                                                                                                                             |
| delay                   | `1000`            | The delay between each attempt in milliseconds. You can provide a factor to have the delay grow exponentially.                                                                     |
| initialDelay            | `0`               | The intialDelay is the amount of time to wait before making the first attempt. This option should typically be 0 since you typically want the first attempt to happen immediately. |
| factor                  | `2`               | The factor option is used to grow the delay exponentially.                                                                                                                         |
| maxAttempts             | `0`               | The maximum number of attempts or 0 if there is no limit on number of attempts.                                                                                                    |
| minDelay                | `1000`            | minDelay is used to set a lower bound of delay when jitter is enabled. This property has no effect if jitter is disabled.                                                          |
| maxDelay                | `30000`           | The maxDelay option is used to set an upper bound for the delay when factor is enabled. A value of 0 can be provided if there should be no upper bound when calculating delay.     |
| jitter                  | `true`            | If jitter is true then the calculated delay will be a random integer value between minDelay and the calculated delay for the current iteration.                                    |
| timeout                 | `0`               | A timeout in milliseconds. If timeout is non-zero then a timer is set using setTimeout. If the timeout is triggered then future attempts will be aborted.                          |
| messageReconnectTimeout | `30000`           | Closes the connection when after the configured messageReconnectTimeout no message was received.                                                                                   |
| WebSocketPolyfill       | `WebSocket`       | Running in Node.js: Pass a WebSocket polyfill, for example `ws`.                                                                                                                   |
