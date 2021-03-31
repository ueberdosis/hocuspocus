
# Monitor

## toc

## Introduction

<g-image src="@/assets/images/monitor-preview.png" width="700"></g-image>

The Monitor extension adds a live updating dashboard featuring metrics and logs to debug and monitor your hocuspocus instance.

## Installation

Configure your `.npmrc` to look for packages with the @hocuspocus prefix in our private registry, [as described here](/installation#2-installation).

Now you should be able to install the Monitor package with:

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
      // the dashboard will run on the same port hocuspocus it self is running.
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

// TODO
