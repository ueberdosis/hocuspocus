import { createClient } from 'redis'

export default async () => {
  const redis = createClient({
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT || 6379,
  })

  await redis.connect()

  redis.flushDb()
}
