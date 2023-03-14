# Extensions

You can see [our guide to custom extensions](/guides/custom-extensions) to find out how to create your own.

## Table of Contents

We already created some very useful extensions you should check out for sure:

| Extension                               | Description                                                                    |
| --------------------------------------- | ------------------------------------------------------------------------------ |
| [Database](/server/extensions#Database) | A generic database driver that is easily adjustable to work with any database. |
| [Monitor](/server/extensions#Monitor)   | A beautiful dashboard to monitor and debug your Hocuspocus instance.           |
| [Redis](/server/extensions#Redis)       | Scale Hocuspocus horizontally with Redis.                                      |
| [Logger](/server/extensions#Logger)     | Add logging to Hocuspocus.                                                     |
| [Webhook](/server/extensions#Webhook)   | Send document changes via webhook to your API.                                 |
| [Throttle](/server/extensions#Throttle) | Throttle connections by ips.                                                   |

## Database

Store your data in whatever data store you already have with the generic database extension.
It takes a Promise to fetch data and another Promise to store the data, that’s all. Hocuspocus will handle the rest.

### Installation

Install the database extension like this:

```bash
npm install @hocuspocus/extension-database
```

### Configuration

**fetch**

Expects an async function (or Promise) which returns a Y.js compatible Uint8Array (or null).
Make sure to return the same Uint8Array that was saved in store(), and do not create a new Ydoc,
as doing so would lead to a new history (and duplicated content).

If you want to initially create a Ydoc based off raw text/json, you can do so here using a transformer of your choice (e.g. `TiptapTransformer.toYdoc`, or `ProsemirrorTransformer.toYdoc`)

**store**

Expects an async function (or Promise) which persists the Y.js binary data somewhere.

### Usage

The following example uses SQLite to store and retrieve data. You can replace that part with whatever data store you have. As long as you return a Promise you can store data with PostgreSQL, MySQL, MongoDB, S3 … If you actually want to use SQLite, you can have a look at the [SQLite extension](/server/extensions#Sqlite).

```js
import { Server } from "@hocuspocus/server";
import { Database } from "@hocuspocus/extension-database";
import sqlite3 from "sqlite3";

const server = Server.configure({
  extensions: [
    new Database({
      // Return a Promise to retrieve data …
      fetch: async ({ documentName }) => {
        return new Promise((resolve, reject) => {
          this.db?.get(
            `
            SELECT data FROM "documents" WHERE name = $name ORDER BY rowid DESC
          `,
            {
              $name: documentName,
            },
            (error, row) => {
              if (error) {
                reject(error);
              }

              resolve(row?.data);
            }
          );
        });
      },
      // … and a Promise to store data:
      store: async ({ documentName, state }) => {
        this.db?.run(
          `
          INSERT INTO "documents" ("name", "data") VALUES ($name, $data)
            ON CONFLICT(name) DO UPDATE SET data = $data
        `,
          {
            $name: documentName,
            $data: state,
          }
        );
      },
    }),
  ],
});

server.listen();
```

## Logger

Hocuspocus doesn’t log anything. Thanks to this simple extension it will.

### Installation

Install the Logger package with:

```bash
npm install @hocuspocus/extension-logger
```

### Configuration

**Instance name**

You can prepend all logging messages with a configured string.

```js
import { Server } from "@hocuspocus/server";
import { Logger } from "@hocuspocus/extension-logger";

const server = Server.configure({
  name: "hocuspocus-fra1-01",
  extensions: [new Logger()],
});

server.listen();
```

**Disable messages**

You can disable logging for specific messages.

```js
import { Server } from "@hocuspocus/server";
import { Logger } from "@hocuspocus/extension-logger";

const server = Server.configure({
  extensions: [
    new Logger({
      onLoadDocument: false,
      onChange: false,
      onConnect: false,
      onDisconnect: false,
      onUpgrade: false,
      onRequest: false,
      onListen: false,
      onDestroy: false,
      onConfigure: false,
    }),
  ],
});

server.listen();
```

**Custom logger**

You can even pass a custom function to log messages.

```js
import { Server } from "@hocuspocus/server";
import { Logger } from "@hocuspocus/extension-logger";

const server = Server.configure({
  extensions: [
    new Logger({
      log: (message) => {
        // do something custom here
        console.log(message);
      },
    }),
  ],
});

server.listen();
```

## Monitor

The Monitor extension adds a live updating dashboard featuring metrics and logs to debug and monitor your Hocuspocus instance.

### Installation

Install the Monitor package with:

```bash
npm install @hocuspocus/extension-monitor
```

### Configuration

All configuration options are optional.

```js
import { Server } from "@hocuspocus/server";
import { Monitor } from "@hocuspocus/extension-monitor";

const server = Server.configure({
  extensions: [
    new Monitor({
      // [optional] the path the dashboard will be visible on. if you want to
      // show the dashboard at the root of use an empty string. defaults to "dashboard"
      dashboardPath: "dashboard",

      // [optional] you can completely disable the dashboard and just collect metrics.
      // defaults to "true"
      enableDashboard: true,

      // [optional] interval in ms to collect metrics, for example connection count,
      // message count, etc. defaults to "10000"
      metricsInterval: 10000,

      // [optional] interval in ms to collect metrics from your operating system
      // like cpu usage or memory usage. defauls to "10000"
      osMetricsInterval: 10000,

      // [optional] you can launch the dashboard on a different port. if set to null,
      // the dashboard will run on the same port Hocuspocus it self is running.
      // defaults to "null"
      port: null,

      // [optional] add basic auth to your dashboard,
      // defaults to "null"
      password: null,
      user: null,
    }),
  ],
});

server.listen();
```

### Usage

The easiest way to get the monitor to work within a framework, is to simply run it on another port:

```js
import { Server } from "@hocuspocus/server";
import { Monitor } from "@hocuspocus/extension-monitor";

const server = Server.configure({
  extensions: [
    new Monitor({
      port: 1337,
    }),
  ],
});
```

Alternatively you can call the monitors `handleConnection` and `handleRequest` methods yourself. Please note: even when calling `handleRequest` manually you need to configure the monitors path correctly:

```js
import express from "express";
import expressWebsockets from "express-ws";
import { Server } from "@hocuspocus/server";
import { Monitor } from "@hocuspocus/extension-monitor";

const monitor = new Monitor({
  dashboardPath: "monitor",
});

const server = Server.configure({
  extensions: [monitor],
});

const { app } = expressWebsockets(express());

app.get("/monitor", (request, response) => {
  monitor.handleRequest(request, response);
});

app.ws("/monitor", (websocket, request: any) => {
  monitor.handleConnection(websocket, request);
});

app.ws("/:document", (websocket, request: any) => {
  server.handleConnection(websocket, request);
});

app.listen(1234, () => console.log("Listening on http://127.0.0.1:1234…"));
```

## Redis

Hocuspocus can be scaled horizontally using the Redis extension. You can spawn multiple instances of the server behind a
load balancer and sync changes and awareness states through Redis. Hocuspocus will propagate all received updates to all other instances
using Redis and thus forward updates to all clients of all Hocuspocus instances.

Please note that all messages will be handled on all instances of Hocuspocus, so if you are trying to reduce cpu load by spawning multiple
servers, you should not connect them via Redis.

Thanks to [@tommoor](https://github.com/tommoor) for writing the initial implementation of that extension.

### Installation

Install the Redis extension with:

```bash
npm install @hocuspocus/extension-redis
```

### Configuration

For a full documentation on all available Redis and Redis cluster options, check out the
[ioredis API docs](https://github.com/luin/ioredis/blob/master/API.md).

```js
import { Server } from "@hocuspocus/server";
import { Redis } from "@hocuspocus/extension-redis";

const server = Server.configure({
  extensions: [
    new Redis({
      // [required] Hostname of your Redis instance
      host: "127.0.0.1",

      // [required] Port of your Redis instance
      port: 6379,
    }),
  ],
});

server.listen();
```

### Usage

The Redis extension works well with the database extension. Once an instance stores a document, it’s blocked for all other
instances to avoid write conflicts.

```js
import { Hocuspocus } from "@hocuspocus/server";
import { Logger } from "@hocuspocus/extension-logger";
import { Redis } from "@hocuspocus/extension-redis";
import { SQLite } from "@hocuspocus/extension-sqlite";

// Server 1
const server = new Hocuspocus({
  name: "server-1", // make sure to use unique server names
  port: 1234,
  extensions: [
    new Logger(),
    new Redis({
      host: "127.0.0.1", // make sure to use the same Redis instance :-)
      port: 6379,
    }),
    new SQLite(),
  ],
});

server.listen();

// Server 2
const anotherServer = new Hocuspocus({
  name: "server-2",
  port: 1235,
  extensions: [
    new Logger(),
    new Redis({
      host: "127.0.0.1",
      port: 6379,
    }),
    new SQLite(),
  ],
});

anotherServer.listen();
```

## SQLite

### Introduction

For local development purposes it’s nice to have a database ready to go with a few lines of code. That’s what the SQLite extension is for.

### Installation

Install the SQLite extension like this:

```bash
npm install @hocuspocus/extension-sqlite
```

### Configuration

**database**

Valid values are filenames, ":memory:" for an anonymous in-memory database and an empty
string for an anonymous disk-based database. Anonymous databases are not persisted and
when closing the database handle, their contents are lost.

https://github.com/mapbox/node-sqlite3/wiki/API#new-sqlite3databasefilename-mode-callback

Default: `:memory:`

**schema**

The SQLite schema that’s created for you.

Default:

```sql
CREATE TABLE IF NOT EXISTS "documents" (
  "name" varchar(255) NOT NULL,
  "data" blob NOT NULL,
  UNIQUE(name)
)
```

**fetch**

An async function to retrieve data from SQLite. If you change the schema, you probably want to override the query.

**store**

An async function to store data in SQLite. If you change the schema, you probably want to override the query.

**Usage**

By default data is just “stored” in `:memory:`, so it’s wiped when you stop the server. You can pass a file name to persist data on the disk.

```js
import { Server } from "@hocuspocus/server";
import { SQLite } from "@hocuspocus/extension-sqlite";

const server = Server.configure({
  extensions: [
    new SQLite({
      database: "db.sqlite",
    }),
  ],
});

server.listen();
```

## Throttle

This extension throttles connection attempts and bans ip-addresses if it crosses the configured threshold.

Make sure to register it **before** any other extensions!

### Installation

Install the Throttle package with:

```bash
npm install @hocuspocus/extension-throttle
```

### Configuration

```js
import { Server } from "@hocuspocus/server";
import { Throttle } from "@hocuspocus/extension-throttle";

const server = Server.configure({
  extensions: [
    new Throttle({
      // [optional] allows up to 15 connection attempts per ip address per minute.
      // set to null or false to disable throttling, defaults to 15
      throttle: 15,

      // [optional] bans ip addresses for 5 minutes after reaching the threshold
      // defaults to 5
      banTime: 5,
    }),
  ],
});

server.listen();
```

## Webhook

The webhook extension allows you to connect Hocuspocus to your existing application by triggering webhooks on certain events.

### Installation

Install the Webhook package with:

```bash
npm install @hocuspocus/extension-webhook
```

### Configuration

```js
import { Server } from "@hocuspocus/server";
import { Webhook, Events } from "@hocuspocus/extension-webhook";
import { TiptapTransformer } from "@hocuspocus/transformer";

const server = Server.configure({
  extensions: [
    new Webhook({
      // [required] url of your application
      url: "https://example.com/api/hocuspocus",

      // [required] a random string that will be used to verify the request signature
      secret: "459824aaffa928e05f5b1caec411ae5f",

      // [required] a transformer for your document
      transformer: TiptapTransformer,

      // [optional] array of events that will trigger a webhook
      // defaults to [ Events.onChange ]
      events: [Events.onConnect, Events.onCreate, Events.onChange, Events.onDisconnect],

      // [optional] time in ms the change event should be debounced,
      // defaults to 2000
      debounce: 2000,

      // [optional] time in ms after that the webhook will be sent
      // regardless of the configured debouncing, defaults to 10000
      debounceMaxWait: 10000,
    }),
  ],
});

server.listen();
```

### How it works

The webhook extension listens on up to four configurable events/hooks that will trigger a POST request to the configured url.

#### onConnect

When a new user connects to the server, the onConnect webhook will be triggered with the following payload:

```json
{
  "event": "connect",
  "payload": {
    "documentName": "example-document",
    "requestHeaders": {
      "Example-Header": "Example"
    },
    "requestParameters": {
      "example": "12345"
    }
  }
}
```

You can respond with a JSON payload that will be set as context throughout the rest of the application. For example:

```js
// authorize the user by the request parameters or headers
if (payload.requestParameters?.get("token") !== "secret-api-token") {
  response.writeHead(403, "unathorized");
  return response.end();
}

// return context if authorized
response.writeHead(200, { "Content-Type": "application/json" });
response.end(
  JSON.stringify({
    user: {
      id: 1,
      name: "Jane Doe",
    },
  })
);
```

#### onCreate

When a new document is created the onCreate webhook will be triggered with the following payload:

```json
{
  "event": "create",
  "payload": {
    "documentName": "example-document"
  }
}
```

You can use this to import a document into Hocuspocus. The webhook extension will first load the document from the primary storage and only import it if it doesn't already exist in there.

Just respond with all the single documents keyed by their field name. For example:

```js
response.writeHead(200, { "Content-Type": "application/json" });
response.end(
  JSON.stringify({
    // Document for the "secondary" field
    secondary: {},
    // Document for the "default" field
    default: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "What is love?",
            },
          ],
        },
      ],
    },
  })
);
```

#### onChange

When a document is changed the onChange webhook will be triggered with the following payload including the context you set before:

```json
{
  "event": "change",
  "payload": {
    "documentName": "example-document",
    "document": {
      "another-field-name": {},
      "field-name": {
        "type": "doc",
        "content": [
          {
            "type": "paragraph",
            "content": [
              {
                "type": "text",
                "text": "What is love?"
              }
            ]
          }
        ]
      }
    },
    "context": {
      "user_id": 1,
      "name": "Jane Doe"
    }
  }
}
```

Because this happens on every keystroke up to multiple times a second, the webhook is debounced by default. You can configure this (or shut it off entirely) with the `debounce` and `debounceMaxWait` configuration options.

#### onDisconnect

When a user disconnects the onDisconnect webhook will be triggered with the following payload:

```json
{
  "event": "disconnect",
  "payload": {
    "documentName": "example-document",
    "context": {
      "user_id": 1,
      "name": "Jane Doe"
    }
  }
}
```

### Transformation

The Y-Doc must be serialized into something readable by your application and when importing a document it must be converted into a Y-Doc respectively.

Because Hocuspocus doesn't know how your data is structured, you need to pass a transformer to the Webhook extension. You can use one of the transformers from the `@hocuspocus/transformer` package. Make sure to configure them properly. In this example we used the TiptapTransformer that needs the list of extensions:

```js
import { Server } from "@hocuspocus/server";
import { Webhook } from "@hocuspocus/extension-webhook";
import { TiptapTransformer } from "@hocuspocus/extension-transformer";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";

const server = Server.configure({
  extensions: [
    new Webhook({
      url: "https://example.com/api/webhook",
      secret: "459824aaffa928e05f5b1caec411ae5f",

      transformer: TiptapTransformer.extensions([Document, Paragraph, Text]),
    }),
  ],
});

server.listen();
```

Alternatively you can write your own implementation by simply passing functions that convert a Y-Doc to your representation and vice versa:

```js
import { Server } from "@hocuspocus/server";
import { Webhook } from "@hocuspocus/extension-webhook";
import { Doc } from "yjs";

const server = Server.configure({
  extensions: [
    new Webhook({
      url: "https://example.com/api/webhook",
      secret: "459824aaffa928e05f5b1caec411ae5f",

      transformer: {
        toYdoc(document: any, fieldName: string): Doc {
          // convert the given document (from your api) to a ydoc using the provided fieldName
          return new Doc();
        },
        fromYdoc(document: Doc): any {
          // convert the ydoc to your representation
          return document.toJSON();
        },
      },
    }),
  ],
});

server.listen();
```

### Verify Request Signature

On your application server you should verify the signature coming from the webhook extension to secure the route.

The extension sends POST requests, and the signature is stored in the `X-Hocuspocus-Signature-256` header containing a message authentication code created with sha256.

Here are some examples how you could do that in different languages:

**PHP**

```php
use Symfony\Component\HttpFoundation\Request;

function verifySignature(Request $request) {
  $secret = '459824aaffa928e05f5b1caec411ae5f';

  if (($signature = $request->headers->get('X-Hocuspocus-Signature-256')) == null) {
      throw new Exception('Header not set');
  }

  $parts = explode('=', $signature);

  if (count($parts) != 2) {
      throw new Exception('Invalid signature format');
  }

  $digest = hash_hmac('sha256', $request->getContent(), $secret);

  return hash_equals($digest, $parts[1]);
}

```

**JavaScript**

```js
import { IncomingMessage } from 'http'

const secret = '459824aaffa928e05f5b1caec411ae5f'

const verifySignature = (request: IncomingMessage): boolean => {
  const signature = Buffer.from(request.headers['x-hocuspocus-signature-256'] as string)

  const hmac = createHmac('sha256', secret)
  const digest = Buffer.from(`sha256=${hmac.update(body).digest('hex')}`)

  return signature.length !== digest.length || timingSafeEqual(digest, signature)
}
```
