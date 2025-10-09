import type RedisClient from 'ioredis'
import {EventEmitter} from 'tseep'
import type {
  Pack,
  RSAMessageClose,
  RSAMessagePing,
  RSAMessageSend
} from './RedisServerAffinity'

export class HocusPocusProxySocket extends EventEmitter {
  private replyTo: string
  private socketId: string
  private pub: RedisClient
  private pack: Pack
  readyState = 1
  constructor(pub: RedisClient, pack: Pack, replyTo: string, socketId: string) {
    super()
    this.replyTo = replyTo
    this.socketId = socketId
    this.pub = pub
    this.pack = pack
    this.on('close', () => {
      this.readyState = 3
    })
  }
  private publish(msg: RSAMessageClose | RSAMessagePing | RSAMessageSend) {
    this.pub.publish(this.replyTo, this.pack(msg))
  }
  close(code?: number, reason?: string) {
    const msg: RSAMessageClose = {type: 'close', code, reason, socketId: this.socketId}
    this.publish(msg)
  }
  ping() {
    const msg: RSAMessagePing = {type: 'ping', socketId: this.socketId}
    this.publish(msg)
  }
  send(message: Uint8Array) {
    const msg: RSAMessageSend = {type: 'send', socketId: this.socketId, message}
    this.publish(msg)
  }
}
