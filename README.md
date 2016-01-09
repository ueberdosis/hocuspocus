# Websockets Connector for [Yjs](https://github.com/y-js/yjs)

*y-websockets-server* is the connection point for *y-websocket-client*. It saves the shared data, an distributes it efficiently to all connected clients.

### Set up your own websocket-server installation:
1. Install package `npm install -g y-websocket-server`
2. execute binary `y-websocket-server --port 1234` (also supports `--debug` flag)

*y-websockets-server* installs *yjs* as a dependency. You have to make sure that the installed *yjs* package version matches the *yjs* version used on the client side!
This is why I recommend to have your own server installation for productive systems.
I can't guarantee that the standard server is always up, and/or matches your yjs version (I'll update the yjs version always to match the newest version).

### TODO
* Save shared data persistently in a database (e.g. choose a database adapter)