---
tableOfContents: true
---

# Configuration

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

## Settings
There is definitely more to configure. Find the full list of all available settings below.

### url
The URL of the hocuspocus/WebSocket server.

Default: `''`

### parameters
Parameters will be added to the server URL and passed to the server.

Default: `{}`

### name
The name of the document.

Default: `''`

### document
The actual Y.js document. Optional, by default a new document is created and be access through `provider.document`.

Default: `new Y.Doc()`

### token
An authentication token that will be passed to the server (works with strings, functions and Promises).

Default: `''`

### awareness
Awareness object, by default attached to the passed Y.js document.

Default: `new Awareness()`

### connect
Whether to connect to the server after intialization.

Default: `true`

### broadcast
By default changes are synced between browser tabs through broadcasting.

Default: `true`

### forceSyncInterval
Ask the server every x ms for updates.

Default: `false`

### delay
The delay between each attempt in milliseconds. You can provide a factor to have the delay grow exponentially.

Default: `1000`

### initialDelay
The intialDelay is the amount of time to wait before making the first attempt. This option should typically be 0 since you typically want the first attempt to happen immediately.

Default: `0`

### factor
The factor option is used to grow the delay exponentially.

Default: `2`

### maxAttempts
The maximum number of attempts or 0 if there is no limit on number of attempts.

Default: `0`

### minDelay
minDelay is used to set a lower bound of delay when jitter is enabled. This property has no effect if jitter is disabled.

Default: `1000`

### maxDelay
The maxDelay option is used to set an upper bound for the delay when factor is enabled. A value of 0 can be provided if there should be no upper bound when calculating delay.

Default: `30000`

### jitter
If jitter is true then the calculated delay will be a random integer value between minDelay and the calculated delay for the current iteration.

Default: `true`

### timeout
A timeout in milliseconds. If timeout is non-zero then a timer is set using setTimeout. If the timeout is triggered then future attempts will be aborted.

Default: `0`

### messageReconnectTimeout
Closes the connection when after the configured messageReconnectTimeout no message was received.

Default: `30000`

### WebSocketPolyfill
Running in Node.js: Pass a WebSocket polyfill, for example `ws`.

Default: `WebSocket`

### quiet
The provider will output a few warnings to help you. In case you want to disable those, just set `quiet` to `true`.

Default: `false`
