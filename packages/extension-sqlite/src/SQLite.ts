import { Database, DatabaseConfiguration } from '@hocuspocus/extension-database'
import sqlite3 from 'sqlite3'

export interface SQLiteConfiguration extends DatabaseConfiguration {
  database: string,
}

export class SQLite extends Database {
  db?: sqlite3.Database

  configuration: SQLiteConfiguration = {
    fetchUpdates: async ({ documentName }) => {
      return new Promise((resolve, reject) => {
        this.db?.all('SELECT data FROM documents WHERE name = $name ORDER BY rowid', {
          $name: documentName,
        }, (err, rows) => {
          resolve(rows.map(row => row.data))
        })
      })
    },
    storeUpdate: async ({ documentName, update }) => {
      this.db?.run('INSERT INTO documents ("name", "data") VALUES ($name, $data)', {
        $name: documentName,
        $data: update,
      })
    },
    database: ':memory:',
  }

  /**
   * Constructor
   */
  constructor(configuration?: Partial<SQLiteConfiguration>) {
    super({})

    this.configuration = {
      ...this.configuration,
      ...configuration,
    }
  }

  async onConfigure() {
    this.db = new sqlite3.Database(this.configuration.database)

    this.db.run(`CREATE TABLE "documents" (
        "name" varchar(255) NOT NULL,
        "data" blob NOT NULL
    );`)
  }
}
