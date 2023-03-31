import express from 'express'
import expressWebsockets from 'express-ws'
// @ts-ignore
import jsonwebtoken from 'jsonwebtoken'
// @ts-ignore
import cors from 'cors'

const { app } = expressWebsockets(express())
app.use(cors())

app.get('/', (request, response) => {
  // do NOT do this in production, this is just for demo purposes. The secret MUST be stored on the server and never reach the client side.
  const { secret } = request.query

  const jwt = jsonwebtoken.sign({
    allowedDocumentNames: ['test1', 'test2'],
  }, secret?.toString() ?? '')

  response.send(jwt)
})
app.listen(1234, () => console.log('Listening on http://127.0.0.1:1234…'))
