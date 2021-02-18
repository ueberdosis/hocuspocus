import levelup, { LevelUp } from 'levelup'
import rocksDB from 'rocksdb'
import moment, { Moment } from 'moment'

export interface Configuration {
  storagePath: string,
  interval: number,
}

export class Storage {

  configuration: Configuration = {
    storagePath: './dashboard',
    interval: 5,
  }

  db: LevelUp

  /**
   * Constructor
   */
  constructor(configuration?: Partial<Configuration>) {
    this.configuration = {
      ...this.configuration,
      ...configuration,
    }

    this.db = levelup(rocksDB(this.configuration.storagePath))

    if (this.configuration.interval < 1 || this.configuration.interval > 60) {
      throw new Error('Smallest possible interval is 1, highest is 60')
    }
  }

  get(key: string, defaultValue: any = null): Promise<any> {
    return new Promise(resolve => {
      this.db.get(key)
        .then(value => {
          resolve(value)
        })
        .catch(() => {
          this.db.put(key, defaultValue)
          resolve(defaultValue)
        })
    })
  }

  set(key: string, value: any): Promise<any> {
    return this.db.put(key, value)
  }

  async increment(name: string): Promise<any> {
    const key = this.key(name)
    await this.db.put(key, await this.get(key, 0) + 1)
  }

  async decrement(name: string): Promise<any> {
    const key = this.key(name)
    await this.db.put(key, await this.get(key, 0) - 1)
  }

  key(name: string, time?: Moment): string {
    if (!time) {
      const { interval } = this.configuration
      time = moment().minutes(Math.floor(moment().minutes() / interval) * interval)
    }

    return `${name}_${time.format('YYYY-MM-DD-HH-mm')}`
  }
}
