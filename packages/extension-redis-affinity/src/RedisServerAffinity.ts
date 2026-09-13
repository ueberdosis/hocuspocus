import type {IncomingHttpHeaders} from 'node:http2'
import {
  type afterUnloadDocumentPayload,
  type Extension,
  type Hocuspocus,
  IncomingMessage,
  type onConfigurePayload,
  type onLoadDocumentPayload,
  type WebSocketLike
} from '@hocuspocus/server'
import type RedisClient from 'ioredis'
import {HocusPocusProxySocket} from './HocusPocusProxySocket'

export type SecondParam<T> = T extends (arg1: any, arg2: infer A, ...args: any[]) => any ? A : never
export type RSAMessageProxy = {
  type: 'proxy'
  replyTo: string
  message: Uint8Array<ArrayBufferLike>
  serializedHTTPRequest: SerializedHTTPRequest
}

export type RSAMessageCloseProxy = {
  type: 'closeProxy'
  socketId: string
}

export type RSAMessageUnload = {
  type: 'unload'
  documentName: string
}

export type RSAMessageClose = {
  type: 'close'
  code?: number
  reason?: string
  socketId: string
}

export type RSAMessageSend = {
  type: 'send'
  message: Uint8Array<ArrayBufferLike>
  socketId: string
}

export type RSAMessageCustomEventStart<TName = string, TPayload = any> = {
  type: 'customEventStart'
  documentName: string
  eventName: TName
  payload: TPayload
  replyTo: string
  replyId: number
}

export type RSAMessageCustomEventComplete = {
  type: 'customEventComplete'
  replyId: number
  payload: any
}

export type RSAMessage =
  | RSAMessageProxy
  | RSAMessageCloseProxy
  | RSAMessageUnload
  | RSAMessageClose
  | RSAMessageSend
  | RSAMessageCustomEventStart
  | RSAMessageCustomEventComplete

export type SerializedHTTPRequest = {
  method: string
  url: string
  headers: IncomingHttpHeaders & {'sec-websocket-key': string}
  socket: {remoteAddress: string}
}
export type Pack = (msg: RSAMessage) => string | Buffer<ArrayBufferLike>
type Unpack = (packedMessage: Uint8Array | Buffer<ArrayBufferLike>) => RSAMessage
type ServerId = string
type DocumentName = string
type SocketId = string
type CustomEventName = string
type CustomEvents = Record<CustomEventName, (documentName: string, payload: any) => Promise<any>>
// Not exported by @hocuspocus/server
type ClientConnection = ReturnType<Hocuspocus['handleConnection']>
type OriginConnection = {clientConnection: ClientConnection; socket: WebSocketLike}
type ProxyConnection = {clientConnection: ClientConnection; socket: HocusPocusProxySocket}

interface Configuration<TCE> {
  redis: RedisClient
  pack: Pack
  unpack: Unpack
  serverId: ServerId
  lockTTL?: number
  customEventTTL?: number
  prefix?: string
  customEvents?: TCE
  // Derive the hocuspocus context once per socket instead of re-deriving it in a
  // per-document hook like onConnect/onAuthenticate. Runs on the origin server when
  // the socket opens and on the doc owner when the first proxied message arrives.
  deriveContext?: (serializedHTTPRequest: SerializedHTTPRequest) => Record<string, any>
}

// Hocuspocus expects a web-standard Request, so rehydrate one from what crossed the wire
const toWebRequest = (serializedHTTPRequest: SerializedHTTPRequest) => {
  const {method, url, headers} = serializedHTTPRequest
  const webHeaders = new Headers()
  Object.entries(headers).forEach(([name, value]) => {
    if (Array.isArray(value)) {
      value.forEach((v) => {
        webHeaders.append(name, v)
      })
    } else if (value !== undefined) {
      webHeaders.set(name, value)
    }
  })
  return new Request(new URL(url, 'http://localhost'), {
    method,
    headers: webHeaders
  })
}

export class RedisServerAffinity<TCE extends CustomEvents> implements Extension {
  priority = 1000
  private pub: RedisClient
  private sub: RedisClient
  private pack: Pack
  private unpack: Unpack
  private originConnections: Record<SocketId, OriginConnection> = {}
  private locks: Record<DocumentName, NodeJS.Timeout> = {}
  private lockPromises: Record<DocumentName, Promise<ServerId | null>> = {}
  private proxyConnections: Record<SocketId, ProxyConnection> = {}
  private prefix: string
  private lockPrefix: string
  private msgChannel: string
  private serverId: ServerId
  private customEventTTL: number
  private lockTTL: number
  private instance!: Hocuspocus
  private customEvents: TCE
  private replyIdCounter = 0
  private pendingReplies: Record<number, PromiseWithResolvers<any>['resolve']> = {}
  private deriveContext: (serializedHTTPRequest: SerializedHTTPRequest) => Record<string, any>
  constructor(configuration: Configuration<TCE>) {
    const {
      redis,
      pack,
      unpack,
      serverId,
      lockTTL,
      prefix,
      customEvents,
      customEventTTL,
      deriveContext
    } = configuration
    this.pub = redis.duplicate()
    this.sub = redis.duplicate()
    this.pack = pack
    this.unpack = unpack
    this.serverId = serverId
    this.lockTTL = lockTTL ?? 10_000
    this.customEventTTL = customEventTTL ?? 30_000
    this.prefix = prefix ?? 'rsa'
    this.lockPrefix = `${this.prefix}Lock`
    this.msgChannel = `${this.prefix}Msg`
    this.customEvents = (customEvents as any) ?? ({} as any as CustomEvents)
    this.deriveContext = deriveContext ?? (() => ({}))
    this.sub.subscribe(this.msgChannel, `${this.msgChannel}:${this.serverId}`)
    this.sub.on('messageBuffer', this.handleRedisMessage)
  }
  private getKey(documentName: string) {
    return `${this.lockPrefix}:${documentName}`
  }

  private closeProxy(socketId: string) {
    const entry = this.proxyConnections[socketId]
    if (entry) {
      delete this.proxyConnections[socketId]
      const {socket, clientConnection} = entry
      // The origin socket is already gone; don't echo a close message back
      socket.markClosed()
      clientConnection.handleClose({code: 1000, reason: 'provider_initiated'})
    }
  }

  private handleProxyMessage(
    msg: Pick<RSAMessageProxy, 'replyTo' | 'message' | 'serializedHTTPRequest'>
  ) {
    const {replyTo, message, serializedHTTPRequest} = msg
    const {headers} = serializedHTTPRequest
    const socketId = headers['sec-websocket-key']
    let entry = this.proxyConnections[socketId]
    if (!entry) {
      const socket = new HocusPocusProxySocket(this.pub, this.pack, replyTo, socketId)
      const clientConnection = this.instance.handleConnection(
        socket,
        toWebRequest(serializedHTTPRequest),
        this.deriveContext(serializedHTTPRequest)
      )
      entry = {clientConnection, socket}
      this.proxyConnections[socketId] = entry
    }
    entry.clientConnection.handleMessage(message)
  }

  private getLock(documentName: string) {
    return this.pub.get(this.getKey(documentName))
  }

  private getOrClaimLock(documentName: string) {
    const lockPromise = this.pub.set(
      this.getKey(documentName),
      this.serverId,
      'PX',
      this.lockTTL,
      'NX',
      'GET'
    )
    this.lockPromises[documentName] = lockPromise
    // Briefly cache the serverId that claimed the doc to reduce load on redis
    // When the claimant unloads the doc, it will send an unload message to immediately clear this
    // a lockTTL / 2 guarantees stale reads < lockTTL upon server crash
    setTimeout(() => {
      delete this.lockPromises[documentName]
    }, this.lockTTL / 2)
    return lockPromise
  }

  private getOrClaimLockThrottled(documentName: string) {
    const existingWorkerIdPromise = this.lockPromises[documentName]
    if (existingWorkerIdPromise) return existingWorkerIdPromise
    return this.getOrClaimLock(documentName)
  }

  private handleRedisMessage = async (_channel: Buffer, packedMessage: Buffer) => {
    const msg = this.unpack(packedMessage) as RSAMessage
    const {type} = msg
    if (type === 'proxy') {
      this.handleProxyMessage(msg)
      return
    }
    if (type === 'closeProxy') {
      this.closeProxy(msg.socketId)
      return
    }
    if (type === 'unload') {
      delete this.lockPromises[msg.documentName]
      return
    }
    if (type === 'customEventStart') {
      const {documentName, eventName, payload, replyTo, replyId} = msg
      const res = await this.handleEventLocally(
        eventName as Extract<keyof TCE, string>,
        documentName,
        payload
      )
      const reply: RSAMessageCustomEventComplete = {
        type: 'customEventComplete',
        replyId,
        payload: res
      }
      this.pub.publish(`${replyTo}`, this.pack(reply))
      return
    }
    if (type === 'customEventComplete') {
      const {replyId, payload} = msg
      const resolveFn = this.pendingReplies[replyId]
      if (!resolveFn) return
      delete this.pendingReplies[replyId]
      resolveFn(payload)
      return
    }
    const {socketId} = msg
    const entry = this.originConnections[socketId]
    if (!entry) {
      // origin socket already cleaned up
      return
    }
    const {socket} = entry
    if (type === 'close') {
      socket.close(msg.code, msg.reason)
    } else if (type === 'send') {
      socket.send(msg.message)
    }
  }

  async maintainLock(documentName: string) {
    this.locks[documentName] = setInterval(() => {
      this.pub.set(this.getKey(documentName), this.serverId, 'PX', this.lockTTL)
    }, this.lockTTL / 2)
  }

  async releaseLock(documentName: string) {
    clearInterval(this.locks[documentName])
    delete this.locks[documentName]
    return this.pub.del(this.getKey(documentName))
  }

  private async handleEventLocally<TName extends Extract<keyof TCE, string>>(
    eventName: TName,
    documentName: string,
    payload: any
  ) {
    const handler = this.customEvents[eventName]
    if (!handler) throw new Error(`Invalid eventName: ${eventName}`)
    const result = await handler(documentName, payload)
    return result as Promise<ReturnType<TCE[TName]>>
  }

  async handleEvent<TName extends Extract<keyof TCE, string>>(
    eventName: TName,
    documentName: string,
    payload: any,
    // if true, don't claim the lock. Useful for targeting pages that are currently open
    onlyIfOpen = false
  ) {
    const isDocLoadedOnInstance = this.instance.documents.has(documentName)

    if (isDocLoadedOnInstance) {
      return this.handleEventLocally(eventName, documentName, payload)
    }

    const proxyTo = await (onlyIfOpen
      ? this.getLock(documentName)
      : this.getOrClaimLockThrottled(documentName))

    if (!proxyTo && onlyIfOpen) {
      return
    }

    if (proxyTo && proxyTo !== this.serverId) {
      ++this.replyIdCounter // bug in biome thinks this.replyIdCounter is not used if written on the line below
      const replyId = this.replyIdCounter
      // another server owns the doc
      const proxyMessage: RSAMessageCustomEventStart = {
        eventName,
        documentName,
        payload,
        replyTo: `${this.msgChannel}:${this.serverId}`,
        replyId,
        type: 'customEventStart'
      }
      const msg = this.pack(proxyMessage)
      this.pub.publish(`${this.msgChannel}:${proxyTo}`, msg)
      const {promise, resolve, reject} = Promise.withResolvers()
      this.pendingReplies[replyId] = resolve
      setTimeout(() => {
        delete this.pendingReplies[replyId]
        reject(new Error('TIMEOUT'))
      }, this.customEventTTL)
      return promise as Promise<ReturnType<TCE[TName]>>
    }
    // This server owns the document, but hocuspocus hasn't loaded it yet
    return this.handleEventLocally(eventName, documentName, payload)
  }

  async lockDocument(documentName: string) {
    const proxyTo = await this.getOrClaimLockThrottled(documentName)
    if (proxyTo && proxyTo !== this.serverId) {
      throw new Error(`Could not lock document: ${documentName}`)
    }
    this.maintainLock(documentName)
    return () => this.releaseLock(documentName)
  }

  /* WebSocket Server Hooks */
  onSocketOpen(ws: WebSocketLike, serializedHTTPRequest: SerializedHTTPRequest) {
    const socketId = serializedHTTPRequest.headers['sec-websocket-key']
    const clientConnection = this.instance.handleConnection(
      ws,
      toWebRequest(serializedHTTPRequest),
      this.deriveContext(serializedHTTPRequest)
    )
    this.originConnections[socketId] = {clientConnection, socket: ws}
  }

  async onSocketMessage(serializedHTTPRequest: SerializedHTTPRequest, detachableMsg: ArrayBuffer) {
    const message = new Uint8Array(detachableMsg.slice())
    const tmpMsg = new IncomingMessage(detachableMsg)
    const documentNameAndSessionId = tmpMsg.readVarString()
    // session-aware providers suffix the documentName with \0sessionId
    const sepIdx = documentNameAndSessionId.indexOf('\0')
    const documentName =
      sepIdx === -1 ? documentNameAndSessionId : documentNameAndSessionId.slice(0, sepIdx)
    const isDocLoadedOnInstance = this.instance.documents.has(documentName)
    const socketId = serializedHTTPRequest.headers['sec-websocket-key']
    const entry = this.originConnections[socketId]
    if (!entry) return
    const {clientConnection} = entry

    if (isDocLoadedOnInstance) {
      clientConnection.handleMessage(message)
      return
    }

    const proxyTo = await this.getOrClaimLockThrottled(documentName)
    if (proxyTo && proxyTo !== this.serverId) {
      // another server owns the doc
      const proxyMessage: RSAMessageProxy = {
        serializedHTTPRequest: serializedHTTPRequest,
        replyTo: `${this.msgChannel}:${this.serverId}`,
        message,
        type: 'proxy'
      }
      const msg = this.pack(proxyMessage)
      this.pub.publish(`${this.msgChannel}:${proxyTo}`, msg)
      return
    }
    // This server owns the document, but hocuspocus hasn't loaded it yet
    clientConnection.handleMessage(message)
  }

  onSocketClose(socketId: string, code?: number, reason?: ArrayBuffer) {
    const entry = this.originConnections[socketId]
    if (!entry) return
    delete this.originConnections[socketId]
    entry.clientConnection.handleClose({
      code: code ?? 1000,
      reason: reason ? Buffer.from(reason).toString() : ''
    })
    const msg: RSAMessageCloseProxy = {type: 'closeProxy', socketId}
    this.pub.publish(this.msgChannel, this.pack(msg)).catch(() => {})
  }

  /* Hocuspocus hooks */
  async onConfigure({instance}: onConfigurePayload) {
    this.instance = instance
  }

  async onLoadDocument(data: onLoadDocumentPayload) {
    const {documentName} = data
    // Refresh the lock TTL
    this.maintainLock(documentName)
  }

  async afterUnloadDocument(data: afterUnloadDocumentPayload) {
    const {documentName} = data
    this.releaseLock(documentName)
    // Broadcast to cluster to immediately remove the cached redis value
    const msg: RSAMessageUnload = {type: 'unload', documentName}
    this.pub.publish(this.msgChannel, this.pack(msg))
  }

  async onDestroy() {
    this.pendingReplies = {}
    this.pub.disconnect(false)
    this.sub.disconnect(false)
  }
}
