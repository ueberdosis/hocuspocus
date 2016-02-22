# Websockets Connector for [Yjs](https://github.com/y-js/yjs)

*y-websockets-server* is the connection point for *y-websockets-client*. It saves the shared data, an distributes it efficiently to all connected clients.

### Set up your own websocket-server installation:

##### Globally (easy)
1. Install package `npm install -g y-websockets-server`
2. Execute binary `y-websockets-server --port 1234` (also supports `--debug` flag)

##### Locally (recommended if you intend to mody y-websockets-server)

1. Set up a new project `mkdir my-y-websockets-server && cd $_ && git init && npm init`
2. Install `npm i --save y-websockets-server`
3. Copy executable `cp node_modules/y-websockets-server/src/server.js .`
4. Start server `node server.js`

**Locally + Heroku**

5. Create Procfile `echo "web: node index.js" > Procfile`
6. Add heroku app `heroku create my-websockets-server`
7. Commit & Push to heroku `git add -A && git commit -am 'init' && git push heroku master`
6. Start app `heroku ps:scale web=1`



*y-websockets-server* installs *yjs* as a dependency. You have to make sure that the installed *yjs* package version matches the *yjs* version used on the client side!
This is why I recommend to have your own server installation for productive systems.
I can't guarantee that the standard server is always up, and/or matches your yjs version (I'll update the yjs version always to match the newest version).

### TODO
* Save shared data persistently in a database (e.g. choose a database adapter)
