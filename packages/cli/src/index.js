#!/usr/bin/env node

import { Logger } from "@hocuspocus/extension-logger";
import { SQLite } from "@hocuspocus/extension-sqlite";
import { Webhook } from "@hocuspocus/extension-webhook";
import { Server } from "@hocuspocus/server";
import meow from "meow";

export const cli = meow(
	`
  Usage
    $ hocuspocus [options]

  Options
    --port=, -p     Set the port, defaults to 1234.
    --webhook=, -w  Configure a custom webhook.
    --sqlite=, -s   Store data in a SQLite database, defaults to :memory:.
    --version       Show the current version number.

  Examples
    $ hocuspocus --port 8080
    $ hocuspocus --webhook http://localhost/webhooks/hocuspocus
    $ hocuspocus --sqlite
    $ hocuspocus --sqlite database/default.sqlite
`,
	{
		importMeta: import.meta,
		flags: {
			port: {
				type: "string",
				shortFlag: "p",
				default: "1234",
			},
			webhook: {
				type: "string",
				shortFlag: "w",
				default: "",
			},
			sqlite: {
				type: "string",
				shortFlag: "s",
				default: "",
			},
		},
	},
);

export const getConfiguredWebhookExtension = () => {
	return cli.flags.webhook
		? new Webhook({
				url: cli.flags.webhook,
			})
		: undefined;
};

export const getConfiguredSQLiteExtension = () => {
	if (cli.flags.sqlite) {
		return new SQLite({
			database: cli.flags.sqlite,
		});
	}
	if (process.argv.includes("--sqlite")) {
		return new SQLite();
	}

	return undefined;
};

const server = new Server({
	port: Number.parseInt(cli.flags.port, 10),
	extensions: [
		new Logger(),
		getConfiguredWebhookExtension(),
		getConfiguredSQLiteExtension(),
	].filter((extension) => extension),
});

server.listen();
