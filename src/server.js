const http = require('http')
const server = http.createServer((request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/plain' })
  response.end('OK')
})
const port = process.env.PORT || 1234

const WebSocket = require('ws')
const wss = new WebSocket.Server({ server })
const setupWebSocketConnection = require('./bin/utils.js').setupWSConnection

wss.on('connection', (connection, request) => {
  console.log(`[Websocket Server] New connection to ${request.url}`)

  return setupWebSocketConnection(connection, request)
})

server.listen(port, () => {
  console.log(`[Websocket Server] Listening to ws://127.0.0.1:${port}`)
})
