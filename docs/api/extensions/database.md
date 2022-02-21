---
tableOfContents: true
---

# Database

## Introduction
Store your data in whatever data store you already have with the generic database extension. It takes a Promise to fetch data and another Promise to store the data, that’s all. Hocuspocus will handle the rest.

## Installation
Install the database extension like this:

```bash
npm install @hocuspocus/extension-database
```

## Configuration

### fetch
Expects an async function (or Promise) which returns a Y.js compatible Uint8Array (or null).

### store
Expects an async function (or Promise) which persists the Y.js binary data somewhere.

## Usage
The following example uses SQLite to store and retrieve data. You can replace that part with whatever data store you have. As long as you return a Promise you can store data with PostgreSQL, MySQL, MongoDB, S3 … If you actually want to use SQLite, you can have a look at the [SQLite extensions](/api/extensions/sqlite).

```js
import { Server } from '@hocuspocus/server'
import { Database } from '@hocuspocus/extension-database'
import sqlite3 from 'sqlite3'

const server = Server.configure({
  extensions: [
    new Database({
      // Return a Promise to retrieve data …
      fetch: async ({ documentName }) => {
        return new Promise((resolve, reject) => {
          this.db?.get(`
            SELECT data FROM "documents" WHERE name = $name ORDER BY rowid DESC
          `, {
            $name: documentName,
          }, (error, row) => {
            if (error) {
              reject(error)
            }

            resolve(row?.data)
          })
        })
      },
      // … and a Promise to store data:
      store: async ({ documentName, state }) => {
        this.db?.run(`
          INSERT INTO "documents" ("name", "data") VALUES ($name, $data)
            ON CONFLICT(name) DO UPDATE SET data = $data
        `, {
          $name: documentName,
          $data: state,
        })
      },
    }),
  ],
})

server.listen()
```
