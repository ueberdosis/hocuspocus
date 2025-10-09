# RedisServerAffinity for Hocuspocus

`RedisServerAffinity` is a Hocuspocus extension that enforces **server/page affinity** using Redis. It ensures that a TipTap page is open on **only a single server instance** at a time. This is particularly useful in horizontally scaled environments where multiple Hocuspocus servers are running.

_While path-based routing at the load balancer is generally preferred_, it is acknowledged that infrastructure changes are not always possible. For example, one can use this extension before calling `hocuspocus.openDirectConnection` in order to guarantee that server-based connections do not open the same document. This extension guaurantees server affinity by having each server act as a proxy to the server that currently owns the document.

---

## Installation

```bash
npm install ioredis @hocuspocus/server @hocuspocus/extension-redis-affinity
```

---

## Features

* Guarantees that a document is locked to a single server.
* Maintains Redis locks to prevent multiple servers from opening the same document.
* Handles proxying of WebSocket messages between servers.
* Supports custom event handling across servers.
* Automatic lock maintenance and cleanup when documents unload or sockets disconnect.

---

## Constructor

```ts
new RedisServerAffinity(configuration: Configuration)
```

### Configuration Options

| Option           | Type                                                                           | Description                                                                   |                                              |
| ---------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- | -------------------------------------------- |
| `redis`          | `RedisClient`                                                                  | ioredis instance. Used for pub/sub and locks.                                 |                                              |
| `pack`           | `(msg: RSAMessage) => string \| Buffer`                                                                       | Function to serialize messages for Redis.    |
| `unpack`         | `(packedMessage: Uint8Array                                                    \| Buffer) => RSAMessage`                                                        | Function to deserialize messages from Redis. |
| `serverId`       | `string`                                                                       | Unique identifier for this server instance.                                   |                                              |
| `lockTTL`        | `number`                                                                       | (Optional) Duration in ms to maintain document locks. Default: `10_000`.      |                                              |
| `proxySocketTTL` | `number`                                                                       | (Optional) Duration in ms for keeping proxy sockets alive. Default: `30_000`. |                                              |
| `customEventTTL` | `number`                                                                       | (Optional) Timeout for custom event replies. Default: `30_000`.               |                                              |
| `prefix`         | `string`                                                                       | (Optional) Prefix for Redis keys. Default: `'rsa'`.                           |                                              |
| `customEvents`   | `Record<string, (documentName: string, payload: unknown) => Promise<unknown>>` | (Optional) Map of custom event handlers.                                      |                                              |

---

## Public Methods

### `lockDocument(documentName: string)`

Locks a document to the current server. Useful for freshly created documents.
Below is an example of locking the document before establishing a direct connection & streaming LLM output to it.

```ts
const release = await redisAffinity.lockDocument(documentName);
const conn = await hocuspocus.openDirectConnection(documentName, {})
  for await (const content of contentGenerator) {
    await conn.transact((doc) => {
      for (const block of blocks) {
        frag.insert(frag.length - 1, content)
      }
    })
  }
await conn.disconnect()
await release();
```

* Throws an error if another server owns the document.
* Returns a function that releases the lock when called.

---

---

### `releaseLock(documentName: string)`

Releases a document lock and stops the interval that maintains it.

```ts
await redisAffinity.releaseLock('my-doc');
```

---

### `handleEvent<TName extends string>(eventName: TName, documentName: string, payload: unknown): Promise<ReturnType<TCE[TName]>>`

Emits a **custom event** to the server that owns the document.
Example usage: if documents link to each other, updating the title of one may trigger updating text in backlinked documents.

```ts
const updateLinkedTitles = (documentName: string, payload: {docId: string, title: string}) => {
  const conn = await hocuspocus.openDirectConnection(documentName, {})
  await conn.transact((document) => {
    const node = getNode(docId)
    node.setAttribute('title', title)
  })
  await conn.disconnect()
}
const redisHocusPocus = new RedisServerAffinity({customEvents: {updateLinkedTitles}})

const reuslt = await redisHocusPocus.handleEvent('updateLinkedTitles', documentName, {docId,title})

```

* If the document is loaded locally, the event is handled immediately.
* If another server owns the document, the event is proxied via Redis.

---

## WebSocket Server Hooks

These hooks integrate with your WebSocket server to maintain affinity and proxy messages.
`onSocketMessage` is required until the `beforeHandleMessage` can drop messages without throwing an error

### `onSocketOpen(ws: BaseWebSocket, serializedHTTPRequest: SerializedHTTPRequest, context = {})`

Registers a new client WebSocket and routes the connection to Hocuspocus.

---

### `onSocketMessage(ws: BaseWebSocket, serializedHTTPRequest: SerializedHTTPRequest, detachableMsg: ArrayBuffer)`

Handles incoming messages.

* Sends messages directly if the document is loaded locally.
* Proxies to the owning server otherwise.

---

### `onSocketClose(socketId: string, code?: number, reason?: ArrayBuffer)`

Closes a client WebSocket connection and cleans up proxy sockets if needed.

---

## Hocuspocus Hooks

These are standard Hocuspocus lifecycle hooks implemented by the extension.

* **`onConfigure({instance})`** – Sets the Hocuspocus instance for this extension.
* **`onLoadDocument({documentName})`** – Starts maintaining the lock for a loaded document.
* **`afterUnloadDocument({documentName})`** – Releases the lock and broadcasts an unload message to the cluster.
* **`onDisconnect({requestHeaders})`** – Cleans up a disconnected client and closes proxy sockets.
* **`onDestroy()`** – Disconnects Redis clients and cleans up all resources.

---

## Example Usage

```ts
import {Hocuspocus} from '@hocuspocus/server'
import Redis from 'ioredis'
import {RedisServerAffinity} from './RedisServerAffinity'
import {pack, unpack} from 'msgpackr'
const redis = new Redis()

const redisAffinity = new RedisServerAffinity({
  redis,
  serverId: 'server-1',
  pack,
  unpack,
  customEvents: {
    async myCustomEvent(docName, payload) {
      return {handled: true}
    }
  }
})

const server = new Hocuspocus({port: 1234, extensions: [redisAffinity]})
```

---

## Notes

* Uses Redis `SETNX` instead of Redlock. This guarantees a lock for a single redis instance.
* Ensure that all servers in your cluster use the same Redis instance for locks and pub/sub (or PR to support `RedisCluster`)
