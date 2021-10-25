
# Monitor

## toc

## Introduction

<g-image src="@/assets/images/monitor-preview.png" width="700"></g-image>

The Monitor extension adds a live updating dashboard featuring metrics and logs to debug and monitor your Hocuspocus instance.

## Installation

Install the Monitor package with:

```bash
# with npm
npm install @hocuspocus/extension-monitor

# with Yarn
yarn add @hocuspocus/extension-monitor
```

## Configuration

All configuration options are optional.

```js
import { Server } from '@hocuspocus/server'
import { Monitor } from '@hocuspocus/extension-monitor'

const server = Server.configure({

  extensions: [
    new Monitor({
      // [optional] the path the dashboard will be visible on. if you want to
      // show the dashboard at the root of use an empty string. defaults to "dashboard"
      dashboardPath: 'dashboard',

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

})

server.listen()
```

## Framework integration

The easiest way to get the monitor to work within a framework, is to simply run it on another port:

```typescript
import { Server } from '@hocuspocus/server'
import { Monitor } from '@hocuspocus/extension-monitor'

const server = Server.configure({
  extensions: [
    new Monitor({
      port: 1337,
    }),
  ],
})

```

Alternatively you can call the monitors `handleConnection` and `handleRequest` methods yourself. Please note: even when calling `handleRequest` manually you need to configure the monitors path correctly:

```typescript
import express from 'express'
import expressWebsockets from 'express-ws'
import { Server } from '@hocuspocus/server'
import { Monitor } from '@hocuspocus/extension-monitor'

const monitor = new Monitor({
  path: 'monitor',
})

const server = Server.configure({
  extensions: [
    monitor,
  ],
})

const { app } = expressWebsockets(express())

app.get('/monitor', (request, response) => {
  monitor.handleRequest(request, response)
})

app.ws('/monitor', (websocket, request: any) => {
  monitor.handleConnection(websocket, request)
})

app.ws('/:document', (websocket, request: any) => {
  server.handleConnection(websocket, request)
})

app.listen(1234, () => console.log('Listening on http://127.0.0.1:1234…'))
```
