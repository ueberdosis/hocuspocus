import { Database, DatabaseConfiguration } from '@hocuspocus/extension-database'
import sqlite3 from 'sqlite3'
import chalk from 'chalk'

export interface SQLiteConfiguration extends DatabaseConfiguration {
  /**
   * Valid values are filenames, ":memory:" for an anonymous in-memory database and an empty
   * string for an anonymous disk-based database. Anonymous databases are not persisted and
   * when closing the database handle, their contents are lost.
   *
   * https://github.com/mapbox/node-sqlite3/wiki/API#new-sqlite3databasefilename-mode-callback
   */
  database: string,
}

export class SQLite extends Database {
  db?: sqlite3.Database

  configuration: SQLiteConfiguration = {
    database: ':memory:',
    fetchUpdates: async ({ documentName }) => {
      return new Promise((resolve, reject) => {
        this.db?.all('SELECT data FROM documents WHERE name = $name ORDER BY rowid', {
          $name: documentName,
        }, (error, rows) => {
          if (error) {
            reject(error)
          }

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

  async onListen() {
    console.warn(`  ${chalk.yellow('The SQLite extension is intended to be used in a local development environment, not in a production environment.')}`)
    console.log()
  }

  async onConfigure() {
    this.db = new sqlite3.Database(this.configuration.database)

    this.db.run(`CREATE TABLE "documents" (
        "name" varchar(255) NOT NULL,
        "data" blob NOT NULL
    );`)
  }
}
