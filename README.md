# Websockets Connector for [Yjs](https://github.com/y-js/yjs) (Server)

*y-websockets-server* is the connection point for *y-websockets-client*. It saves the shared data (using the [memory](https://github.com/y-js/y-memory) or the [leveldb](https://github.com/y-js/y-leveldb) database adapter), and distributes it efficiently to all connected clients.

#### Instructions for [y-leveldb](https://github.com/y-js/y-leveldb)

The memory database adapter is installed by default. If you intend to use the [y-leveldb](https://github.com/y-js/y-leveldb) database adapter, make sure to install it first.

```sh
npm install --save y-leveldb [-g]
```

### Global installation (easy)
* Install package `npm install -g y-websockets-server`
* Execute binary `y-websockets-server [--port port] [--db db]` (defaults: port = 1234, db = `memory` (choose either `leveldb` or `memory`)).

Yjs uses [debug](https://github.com/visionmedia/debug) for logging. In order to
turn on logging set the environment variable `DEBUG` to `y*,-y:connector-message`: I.e

```sh
DEBUG=y*,-y:connector-message y-websockets-server --port 1234
```

This is how you redirect the output to a file:

```sh
DEBUG_COLORS=0 DEBUG=y*,-y:connector-message y-websockets-server --port 1234 > log.txt
```

### Local installation (recommended if you intend to modify y-websockets-server)

* Set up a new project

        mkdir my-y-websockets-server && cd $_ && git init && npm init && echo "node_modules" > .gitignore

* Install `npm i --save y-websockets-server`
* Copy executable `cp node_modules/y-websockets-server/src/server.js .`
* Start server `node server.js`

### Setup with Docker

* Clone this repository and navigate to it.
* Build the image: `docker build -t y-websockets-server .`
* Run it: `docker run -it --rm -p 1234:1234 --name y-websockets-server y-websockets-server`
* Feel free to modify the port argument, e.g. to `-p 1773:1234` to run it at port 1773.

### Setup with Heroku
Heroku is really easy to set up, and you get a free *y-websockets-server* with https!
Preliminarily you have to set up heroku - see this great [getting started guide](https://devcenter.heroku.com/articles/getting-started-with-nodejs#introduction)

* Perform the steps from the local installation
* Create Procfile `echo "web: DEBUG=y*,-y:connector-message server.js" > Procfile`
* Specify a node environment. Add this to your package.json:

        "engines": {
          "node": "6.9.1"
        }

* Add heroku app `heroku create my-websockets-server`
* Commit & Push to heroku `git add -A && git commit -am 'init' && git push heroku master`
* Start app `heroku ps:scale web=1`
* Get the url for your websockes-server instance `heroku info` (see *Web Url*).
