import express from 'express'
import expressWebsockets from 'express-ws'
// @ts-ignore
import jsonwebtoken from 'jsonwebtoken'
// @ts-ignore
import cors from 'cors'

const { app } = expressWebsockets(express())
app.use(cors())

const secret = 'x43R5ID9v4POzd73SlrTcGeg330QfAeynhI772N6vQh06RboaBX8g5YOhieynCVA'
app.get('/', (request, response) => {
  const jwt = jsonwebtoken.sign({
    allowedDocumentNames: ['test1', 'test2'],
  }, secret)

  response.send(jwt)
})
app.listen(1234, () => console.log('Listening on http://127.0.0.1:1234…'))
