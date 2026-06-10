import type { DatabaseConfiguration } from "@hocuspocus/extension-database";
import { Database } from "@hocuspocus/extension-database";
import BetterSqlite3 from "better-sqlite3";
import kleur from "kleur";

export const schema = `CREATE TABLE IF NOT EXISTS "documents" (
  "name" varchar(255) NOT NULL,
  "data" blob NOT NULL,
  UNIQUE(name)
)`;

export const selectQuery = `
  SELECT data FROM "documents" WHERE name = $name ORDER BY rowid DESC
`;

export const upsertQuery = `
  INSERT INTO "documents" ("name", "data") VALUES ($name, $data)
    ON CONFLICT(name) DO UPDATE SET data = $data
`;

const SQLITE_INMEMORY = ":memory:";

export interface SQLiteConfiguration extends DatabaseConfiguration {
	/**
	 * Valid values are filenames, ":memory:" for an anonymous in-memory database and an empty
	 * string for an anonymous disk-based database. Anonymous databases are not persisted and
	 * when closing the database handle, their contents are lost.
	 *
	 * https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md#new-daboratabasepath-options
	 */
	database: string;
	/**
	 * The database schema to create.
	 */
	schema: string;
}

export class SQLite extends Database {
	db?: BetterSqlite3.Database;

	configuration: SQLiteConfiguration = {
		database: SQLITE_INMEMORY,
		schema,
		fetch: async ({ documentName }) => {
			const row = this.db
				?.prepare(selectQuery)
				.get({ name: documentName }) as { data: Buffer } | undefined;

			return row?.data ?? null;
		},
		store: async ({ documentName, state }) => {
			this.db?.prepare(upsertQuery).run({
				name: documentName,
				data: state,
			});
		},
	};

	constructor(configuration?: Partial<SQLiteConfiguration>) {
		super({});

		this.configuration = {
			...this.configuration,
			...configuration,
		};
	}

	async onConfigure() {
		this.db = new BetterSqlite3(this.configuration.database);
		this.db.exec(this.configuration.schema);
	}

	async onListen() {
		if (this.configuration.database === SQLITE_INMEMORY) {
			console.warn(
				`  ${kleur.yellow("The SQLite extension is configured as an in-memory database. All changes will be lost on restart!")}`,
			);
			console.log();
		}
	}
}
