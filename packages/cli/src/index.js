#!/usr/bin/env node

import meow from 'meow'
import { Server } from '@hocuspocus/server'
import { Logger } from '@hocuspocus/extension-logger'
import { Webhook } from '@hocuspocus/extension-webhook'

const cli = meow(`
  Usage
    $ hocuspocus

  Options
    --port=, -p     Set the port, defaults to 1234.
    --webhook=, -w  Configure a custom webhook.

  Examples
    $ hocuspocus --port 8080
    $ hocuspocus --webhook http://localhost/webhooks/hocuspocus
`, {
  importMeta: import.meta,
  flags: {
    port: {
      type: 'string',
      alias: 'p',
      default: '1234',
    },
    webhook: {
      type: 'string',
      alias: 'w',
      default: '',
    },
  },
})

const server = Server.configure({
  port: parseInt(cli.flags.port, 10),
  extensions: [
    new Logger(),
    cli.flags.webhook ? new Webhook({
      url: cli.flags.webhook,
    }) : undefined,
  ].filter(extension => extension),
})

server.listen()
