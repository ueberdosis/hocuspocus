export class PersistenceRedis {
  configuration = {
      port: 6379,
      host: '127.0.0.1',
      family: 4, // 4 (IPv4) or 6 (IPv6)
      password: null,
      db: 0,
    }

  constructor(configuration) {
    if (typeof configuration === 'object') {
      this.configuration = {
        ...this.configuration,
        ...configuration
      }
    }

    if (typeof configuration === 'string') {
      this.configuration = configuration
    }

    console.log('Redis persistence configuration: ', this.configuration)

    return this
  }
}
