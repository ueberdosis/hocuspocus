import levelup, { LevelUp } from 'levelup'
import rocksDB from 'rocksdb'
import { Storage } from './Storage'

export interface Configuration {
  storagePath: string,
  interval: number,
}

export class RocksDB extends Storage {

  configuration: Configuration = {
    storagePath: './dashboard',
    interval: 5,
  }

  db: LevelUp

  constructor(configuration?: Partial<Configuration>) {
    super(configuration)

    this.db = levelup(rocksDB(this.configuration.storagePath))
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
}
