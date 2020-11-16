const WebSocket = require('ws')
const http = require('http')
const setupWSConnection = require('y-websocket/bin/utils.js').setupWSConnection
const port = process.env.PORT || 1234
const server = http.createServer()
const wss = new WebSocket.Server({ server })

wss.on('connection', (conn, req) => setupWSConnection(conn, req, { gc: req.url.slice(1) !== 'prosemirror-versions' }))

server.listen(port)

console.log(`Listening to http://localhost:${port}`)