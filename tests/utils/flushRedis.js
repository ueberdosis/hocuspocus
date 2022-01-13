import Redis from 'redis'

export default () => {
  const client = Redis.createClient({
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT || 6379,
  })

  client.flushDb()
}
