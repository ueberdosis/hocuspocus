// @ts-nocheck
import Koa from 'koa'
import websocket from 'koa-easy-ws'
import { Server } from '@hocuspocus/server'
import { Logger } from '@hocuspocus/extension-logger'

const server = Server.configure({
  extensions: [
    new Logger(),
  ],
})

const app = new Koa()

app.use(websocket())

app.use(async (ctx, next) => {
  const ws = await ctx.ws()
  const documentName = ctx.request.path.substring(1)

  server.handleConnection(
    ws,
    ctx.request,
    documentName,
    // additional data (optional)
    {
      user_id: 1234,
    },
  )
})

app.listen(1234)
