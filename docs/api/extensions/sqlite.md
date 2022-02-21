---
tableOfContents: true
---

# SQLite

## Introduction
For local development purposes it’s nice to have a database ready to go with a few lines of code. That’s what the SQLite extension is for.

## Installation
Install the SQLite extension like this:

```bash
npm install @hocuspocus/extension-sqlite
```

## Configuration

### database
Valid values are filenames, ":memory:" for an anonymous in-memory database and an empty
string for an anonymous disk-based database. Anonymous databases are not persisted and
when closing the database handle, their contents are lost.

https://github.com/mapbox/node-sqlite3/wiki/API#new-sqlite3databasefilename-mode-callback

Default: `:memory:`

### schema
The SQLite schema that’s created for you.

Default:
```sql
CREATE TABLE IF NOT EXISTS "documents" (
  "name" varchar(255) NOT NULL,
  "data" blob NOT NULL,
  UNIQUE(name)
)
```

### fetch
An async function to retrieve data from SQLite. If you change the schema, you probably want to override the query.

### store
An async function to store data in SQLite. If you change the schema, you probably want to override the query.

## Usage
By default data is just “stored” in `:memory:`, so it’s wiped when you stop the server. You can pass a file name to persist data on the disk.

```js
import { Server } from '@hocuspocus/server'
import { SQLite } from '@hocuspocus/extension-sqlite'

const server = Server.configure({
  extensions: [
    new SQLite({
      database: 'db.sqlite',
    }),
  ],
})

server.listen()
```
