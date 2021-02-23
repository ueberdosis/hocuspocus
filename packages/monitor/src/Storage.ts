import moment, { Moment } from 'moment'

export interface Configuration {
  interval: number,
}

export class Storage {

  configuration: Configuration = {
    interval: 5,
  }

  storage: Map<string, any> = new Map()

  constructor(configuration?: Partial<Configuration>) {
    this.configuration = {
      ...this.configuration,
      ...configuration,
    }

    if (this.configuration.interval < 1 || this.configuration.interval > 60) {
      throw new Error('Smallest possible interval is 1, highest is 60')
    }
  }

  async get(key: string, defaultValue: any = null): Promise<any> {
    return this.storage.get(key)
  }

  async set(key: string, value: any): Promise<any> {
    return this.storage.set(key, value)
  }

  async delete(key: string): Promise<any> {
    this.storage.delete(key)
  }

  async increment(name: string): Promise<any> {
    const key = this.key(name)
    await this.set(key, await this.get(key, 0) + 1)
  }

  async decrement(name: string): Promise<any> {
    const key = this.key(name)
    await this.set(key, await this.get(key, 0) - 1)
  }

  key(name: string, time?: Moment): string {
    if (!time) {
      const { interval } = this.configuration
      time = moment().minutes(Math.floor(moment().minutes() / interval) * interval)
    }

    return `${name}_${time.format('YYYY-MM-DD-HH-mm')}`
  }
}
