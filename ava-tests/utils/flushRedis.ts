// @ts-ignore
import { createClient } from 'redis'

export const flushRedis = async () => {
  const client = createClient({
    // @ts-ignore
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT || 6379,
  })

  await client.connect()

  return client.flushDb()
}
