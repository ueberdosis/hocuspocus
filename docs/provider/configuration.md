---
tableOfContents: true
---

# Configuration

## Settings

| Setting                 | Description                                                                                                                                                                        | Default Value   |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| `url`                     | The URL of the Hocuspocus/WebSocket server.                                                                                                                                        | `''`             |
| `parameters`              | Parameters will be added to the server URL and passed to the server.                                                                                                               | `{}`             |
| `name`                    | The name of the document.                                                                                                                                                          | `''`             |
| `document`                | The actual Y.js document. Optional, by default a new document is created and be access through provider.document.                                                                  | `new Y.Doc()`    |
| `token`                   | An authentication token that will be passed to the server (works with strings, functions and Promises).                                                                            | `''`             |
| `awareness`               | Awareness object, by default attached to the passed Y.js document.                                                                                                                 | `new Awareness()` |
| `connect`                 | Whether to connect to the server after intialization.                                                                                                                              | `true`           |
| `broadcast`               | By default changes are synced between browser tabs through broadcasting.                                                                                                           | `true`           |
| `forceSyncInterval`       | Ask the server every x ms for updates.                                                                                                                                             | `false`          |
| `delay`                   | The delay between each attempt in milliseconds. You can provide a factor to have the delay grow exponentially.                                                                     | `1000`           |
| `initialDelay`            | The intialDelay is the amount of time to wait before making the first attempt. This option should typically be 0 since you typically want the first attempt to happen immediately. | `0`              |
| `factor`                  | The factor option is used to grow the delay exponentially.                                                                                                                         | `2`              |
| `maxAttempts`             | The maximum number of attempts or 0 if there is no limit on number of attempts.                                                                                                    | `0`              |
| `minDelay`                | minDelay is used to set a lower bound of delay when jitter is enabled. This property has no effect if jitter is disabled.                                                          | `1000`           |
| `maxDelay`                | The maxDelay option is used to set an upper bound for the delay when factor is enabled. A value of 0 can be provided if there should be no upper bound when calculating delay.     | `30000`          |
| `jitter`                  | If jitter is true then the calculated delay will be a random integer value between minDelay and the calculated delay for the current iteration.                                    | `true`           |
| `timeout`                 | A timeout in milliseconds. If timeout is non-zero then a timer is set using setTimeout. If the timeout is triggered then future attempts will be aborted.                          | `0`              |
| `messageReconnectTimeout` | Closes the connection when after the configured messageReconnectTimeout no message was received.                                                                                   | `30000`          |
| `WebSocketPolyfill`       | Running in Node.js: Pass a WebSocket polyfill, for example ws.                                                                                                                     | `WebSocket`      |
| `quiet`                   | The provider will output a few warnings to help you. In case you want to disable those, just set quiet to true.                                                                    | `false`          |

## Usage

There is not much required to set up the provider, a simple example can be found in [Getting started](/getting-started#frontend)
