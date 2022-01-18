import { Database, DatabaseConfiguration } from '@hocuspocus/extension-database'
import sqlite3 from 'sqlite3'
import kleur from 'kleur'

export const schema = `CREATE TABLE IF NOT EXISTS "documents" (
  "name" varchar(255) NOT NULL,
  "data" blob NOT NULL,
  UNIQUE(name)
)`

export const selectQuery = `
  SELECT data FROM "documents" WHERE name = $name ORDER BY rowid DESC
`

export const upsertQuery = `
  INSERT INTO "documents" ("name", "data") VALUES ($name, $data)
    ON CONFLICT(name) DO UPDATE SET data = $data
`

export interface SQLiteConfiguration extends DatabaseConfiguration {
  /**
   * Valid values are filenames, ":memory:" for an anonymous in-memory database and an empty
   * string for an anonymous disk-based database. Anonymous databases are not persisted and
   * when closing the database handle, their contents are lost.
   *
   * https://github.com/mapbox/node-sqlite3/wiki/API#new-sqlite3databasefilename-mode-callback
   */
  database: string,
  /**
   * The database schema to create.
   */
  schema: string,
}

export class SQLite extends Database {
  db?: sqlite3.Database

  configuration: SQLiteConfiguration = {
    database: ':memory:',
    schema,
    fetch: async ({ documentName }) => {
      return new Promise((resolve, reject) => {
        this.db?.get(selectQuery, {
          $name: documentName,
        }, (error, row) => {
          if (error) {
            reject(error)
          }

          resolve(row?.data)
        })
      })
    },
    store: async ({ documentName, state }) => {
      this.db?.run(upsertQuery, {
        $name: documentName,
        $data: state,
      })
    },
  }

  constructor(configuration?: Partial<SQLiteConfiguration>) {
    super({})

    this.configuration = {
      ...this.configuration,
      ...configuration,
    }
  }

  async onConfigure() {
    this.db = new sqlite3.Database(this.configuration.database)
    this.db.run(this.configuration.schema)
  }

  async onListen() {
    console.warn(`  ${kleur.yellow('The SQLite extension is intended to be used in a local development environment, not in a production environment.')}`)
    console.log()
  }
}
