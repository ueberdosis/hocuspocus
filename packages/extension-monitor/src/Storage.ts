import EventEmitter from 'events'
import moment from 'moment'
import collect from 'collect.js'

export class Storage extends EventEmitter {

  timed: Map<string, any> = new Map()

  constant: Map<string, any> = new Map()

  /*
   * Default API
   */

  /**
   * Get all constant values.
   */
  async all(): Promise<any> {
    const data: Array<{key: string, value: any}> = []
    this.constant.forEach((value, key) => data.push({ key, value }))
    return data
  }

  /**
   * Get a constant value by the given key.
   */
  async get(key: string, defaultValue: any = null): Promise<any> {
    return this.constant.get(key) || defaultValue
  }

  /**
   * Set a constant value by the given key.
   */
  async set(key: string, value: any): Promise<any> {
    this.emit('set', { key, value })

    return this.constant.set(key, value)
  }

  /**
   * Delete a constant value by the given key.
   * @param key
   */
  async delete(key: string): Promise<any> {
    this.emit('delete', { key })

    this.constant.delete(key)
  }

  /**
   * Get all timed values.
   */
  async allTimed(): Promise<any> {
    return collect(Array.from(this.timed.values())).flatten(1).toArray()
  }

  /**
   * Add a timed value by the given key.
   */
  async add(key: string, value: any): Promise<any> {
    const data = <Array<any>> await this.timed.get(key) || []

    const event = {
      key,
      timestamp: moment().format('YYYY-MM-DD HH:mm:ss'),
      value,
    }

    data.push(event)

    this.emit('add', event)

    await this.timed.set(key, data)
  }

  /**
   * Remove a timed value by the given timestamp and key.
   */
  async remove(key: string, timestamp: string): Promise<any> {
    let data = <Array<any>> await this.timed.get(key) || []

    data = collect(data)
      .where('timestamp', '!=', timestamp)
      .toArray()

    await this.timed.set(key, data)
  }
}
