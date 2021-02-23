import { Logger } from './utils/logger'
import { Monitor } from '../packages/monitor/src'
import { RocksDB } from '../packages/rocksdb/src'
import { Redis } from '../packages/redis/src'
import { Server } from '../packages/server/src'

const server = Server.configure({
  port: 1234,
  extensions: [
    new Logger(),
    new Monitor({
      port: 8080,
      dashboardPath: '',
    }),
    // new RocksDB(),
    // new Redis(),
  ],
})

server.listen()
