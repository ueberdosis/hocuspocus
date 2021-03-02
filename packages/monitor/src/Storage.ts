import moment from 'moment'
import collect from 'collect.js'
import EventEmitter from 'events'

export class Storage extends EventEmitter {

  storage: Map<string, any> = new Map()

  /*
   * Default API
   */

  async all(): Promise<any> {
    return collect(
      Array.from(this.storage.values()),
    ).flatten(1).toArray()
  }

  async get(key: string, defaultValue: any = null): Promise<any> {
    return this.storage.get(key) || defaultValue
  }

  async set(key: string, value: any): Promise<any> {
    this.emit('set', { key, value })

    return this.storage.set(key, value)
  }

  async delete(key: string): Promise<any> {
    this.emit('delete', { key })

    this.storage.delete(key)
  }

  async add(key: string, value: any): Promise<any> {
    let data = await this.get(key, [])
    data = Array.isArray(data) ? data : []

    const event = {
      timestamp: moment().format('YYYY-MM-DD HH:mm:ss'),
      key,
      value,
    }

    data.push(event)

    this.emit('add', event)

    await this.set(key, data)
  }

  async remove(key: string, timestamp: string): Promise<any> {
    let data = await this.get(key, [])
    data = Array.isArray(data) ? data : []

    data = collect(data)
      .where('timestamp', '!=', timestamp)
      .toArray()

    await this.set(key, data)
  }
}
