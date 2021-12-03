---
tableOfContents: true
---

# Scalability

## Introduction

TODO

## Example setup on Render

### index.js

```js
import { Server } from '@hocuspocus/server'
import { Logger } from '@hocuspocus/extension-logger'
import { Redis } from '@hocuspocus/extension-redis'

const hocuspocus = Server.configure({
  port: 80,
  extensions: [
    new Logger(),
    new Redis({
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
    }),
  ],
})

hocuspocus.listen()
```

### package.json

```json
{
  "name": "hocuspocus-example-setup",
  "version": "1.0.0",
  "description": "an example setup to run Hocuspocus on render",
  "main": "index.js",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "node index.js"
  },
  "engines": {
    "node": ">=15"
  },
  "dependencies": {
    "@hocuspocus/extension-logger": "^1.0.0-alpha.34",
    "@hocuspocus/extension-redis": "^1.0.0-alpha.21",
    "@hocuspocus/server": "^1.0.0-alpha.59"
  }
}
```

### render.yaml

```yaml
services:
- type: web
  name: hocuspocus
  plan: starter
  repo: https://github.com/ueberdosis/hocuspocus-example-setup.git
  branch: main
  env: node
  buildCommand: yarn install
  startCommand: yarn start
  healthCheckPath: /
  envVars:
  - key: REDIS_HOST
    fromService:
      type: pserv
      name: redis
      property: host
  - key: REDIS_PORT
    fromService:
      type: pserv
      name: redis
      property: port
- type: pserv
  name: redis
  env: docker
  disk:
    name: data
    mountPath: /var/lib/redis
    sizeGB: 1
```
