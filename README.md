# Websockets Connector for [Yjs](https://github.com/y-js/yjs)

*y-websockets-server* is the connection point for *y-websockets-client*. It saves the shared data, an distributes it efficiently to all connected clients.

### Notes

*y-websockets-server* installs *yjs* as a dependency. You have to ensure that the *yjs* major package version (`x.*.*`) matches the major *yjs* version (`y.*.*`) used on the client side (`x === y`)!
This is why I recommend to have your own server installation for productive systems.
I can't guarantee that the development server is always up, and/or matches your yjs version (I always update yjs to match the newest version). If something is not working, this is most likely the reason for it.
But don't worry - setting up your own installation is really easy!

### Set up your own y-websocket-server installation

##### Globally (easy)
1. Install package `npm install -g y-websockets-server`
2. Execute binary `y-websockets-server --port 1234` (also supports `--debug` flag)

##### Locally (recommended if you intend to modify y-websockets-server)

1. Set up a new project

        mkdir my-y-websockets-server && cd $_ && git init && npm init && echo "node_modules" > .gitignore

2. Install `npm i --save y-websockets-server`
3. Copy executable `cp node_modules/y-websockets-server/src/server.js .`
4. Start server `node server.js`

##### Using Docker

1. Clone this repository and navigate to it.
2. Build the image: `docker build -t y-websockets-server .`
3. Run it: `docker run -it --rm -p 1234:1234 --name y-websockets-server y-websockets-server`
4. Feel free to modify the port argument, e.g. to `-p 1773:1234` to run it at port 1773.

##### Locally + Heroku
Heroku is really easy to set up, and you get a free *y-websockets-server* with https!
Preliminarily you have to set up heroku - see this great [getting started guide](https://devcenter.heroku.com/articles/getting-started-with-nodejs#introduction)

5. Perform the steps from the local installation
6. Create Procfile `echo "web: node server.js" > Procfile`
7. Specify nodejs environment. Add this to your package.json:

        "engines": {
          "node": "5.0.0"
        }

8. Add heroku app `heroku create my-websockets-server`
9. Commit & Push to heroku `git add -A && git commit -am 'init' && git push heroku master`
10. Start app `heroku ps:scale web=1`
11. Get the url for your websockes-server instance `heroku app:info` (see *Web Url*).


### TODO
* Save shared data persistently in a database (e.g. choose a database adapter)
