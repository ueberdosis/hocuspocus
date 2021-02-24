import moment, { Moment } from 'moment'
import EventEmitter from 'events'

export interface Configuration {
  interval: number,
}

export class Storage extends EventEmitter {

  configuration: Configuration = {
    interval: 1,
  }

  storage: Map<string, any> = new Map()

  constructor(configuration?: Partial<Configuration>) {
    super()

    this.configuration = {
      ...this.configuration,
      ...configuration,
    }

    if (this.configuration.interval < 1 || this.configuration.interval > 60) {
      throw new Error('Smallest possible interval is 1, highest is 60')
    }
  }

  /*
   * Default API
   */

  async all(): Promise<any> {
    const data: Array<any> = []

    this.storage.forEach((value, key) => {
      data.push({ key, value })
    })

    return data
  }

  async get(key: string, defaultValue: any = null): Promise<any> {
    return this.storage.get(key) || defaultValue
  }

  async set(key: string, value: any): Promise<any> {
    this.emit('update', { key, value })

    return this.storage.set(key, value)
  }

  async delete(key: string): Promise<any> {
    this.storage.delete(key)
  }

  /*
   * Special API
   */

  async setTimedValue(key: string, value: any, now = false): Promise<any> {
    const timestamp = this.timestamp(now ? moment() : undefined)
    const data = await this.get(timestamp, {})

    // @ts-ignore
    data[key] = value

    return this.set(timestamp, data)
  }

  async increment(name: string): Promise<any> {
    // const key = this.key(name)
    // await this.set(key, await this.get(key, 0) + 1)
  }

  async decrement(name: string): Promise<any> {
    // const key = this.key(name)
    // await this.set(key, await this.get(key, 0) - 1)
  }

  timestamp(time?: Moment): string {
    if (!time) {
      const { interval } = this.configuration
      time = moment()
        .minutes(Math.floor(moment().minutes() / interval) * interval)
        .seconds(0)
    }

    return `${time.format('YYYY-MM-DD HH:mm:ss')}`
  }
}
