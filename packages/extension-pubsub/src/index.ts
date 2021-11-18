import os from 'os'
import Redis from 'ioredis'
import Redlock from 'redlock'
import debounce from 'lodash.debounce'
import * as Y from 'yjs'
import {
  IncomingMessage,
  OutgoingMessage,
  Document,
  Extension,
  onCreatedDocumentPayload,
  onDisconnectPayload,
} from '@hocuspocus/server'
import { MessageReceiver } from './MessageReceiver'

export interface Configuration {
  port: number,
  host: string,
  /** Options passed directly to Redis constructor */
  redisOpts?: Redis.RedisOptions,
  /** Unique instance name. If none is provided the os hostname is used */
  instanceName: string,
  /** Namespace for redis keys, if none is provided 'hocuspocus' is used */
  namespace: string,
  /** The period of time to wait between calling onPersist, you should choose a balance between reliability and load */
  persistWait: number,
  /** onPersist callback will be called debounced persistWait seconds after the last document update */
  onPersist?: (ydoc: Y.Doc) => Promise<void> | void,
  /** A log function, if none is provided output will go to console */
  log: (...args: any[]) => void,
}

export class PubSub implements Extension {
  configuration: Configuration = {
    port: 6379,
    host: 'localhost',
    namespace: 'hocuspocus',
    instanceName: os.hostname(),
    persistWait: 3000,
    log: console.log, // eslint-disable-line
  }

  redis: Redis.Redis | Redis.Cluster

  sub: Redis.Redis

  redlock: Redlock

  documents = new Map()

  debouncedUpdate: (document: Document) => void

  public constructor(configuration: Partial<Configuration>) {
    const { port, host, redisOpts } = configuration
    this.configuration = {
      ...this.configuration,
      ...configuration,
    }

    this.redis = new Redis(port, host, redisOpts)
    this.sub = new Redis(port, host, redisOpts)
    this.redlock = new Redlock([this.redis])
    this.sub.on('pmessageBuffer', this.handleIncomingMessage)

    // debounced handler should be setup here in the constructor so that the
    // wait time can be configurable
    this.debouncedUpdate = debounce(
      this.handlePersistDocument,
      this.configuration.persistWait,
    )
  }

  public async onCreatedDocument({
    documentName,
    document,
  }: onCreatedDocumentPayload) {
    this.documents.set(documentName, document)

    return new Promise((resolve, reject) => {
      // On document creation the node will connect to pub and sub channels
      // for the document.
      this.sub.psubscribe(this.subKey(documentName), async err => {
        if (err) {
          reject(err)
          return
        }

        this.configuration.log('subscribed', this.subKey(documentName))

        document.awareness.on('update', this.handleAwarenessUpdate(document))
        document.on('update', this.handleUpdate(document))

        // broadcast sync step 1
        const syncMessage = new OutgoingMessage()
          .createSyncMessage()
          .writeFirstSyncStepFor(document)

        await this.redis.publishBuffer(this.pubKey(documentName), Buffer.from(syncMessage.toUint8Array()))

        // request awareness from other instances
        const awarenessMessage = new OutgoingMessage()
          .writeQueryAwareness()
        await this.redis.publishBuffer(this.pubKey(documentName), Buffer.from(awarenessMessage.toUint8Array()))

        resolve(undefined)
      })
    })
  }

  public onDisconnect = async ({ documentName, clientsCount }: onDisconnectPayload) => {
    // Still clients connected?
    if (clientsCount > 0) {
      return
    }

    this.configuration.log('last disconnect', documentName)

    this.documents.delete(documentName)

    // on final connection close sub channel
    this.sub.punsubscribe(this.subKey(documentName), err => {
      if (err) {
        console.error(err)
        return
      }
      this.configuration.log(`Unsubscribed from ${this.subKey(documentName)}`)
    })
  }

  private handlePersistDocument = async (document: Document) => {
    const ttl = 1000

    // attempt to acquire a lock and read lastReceivedTimestamp from Redis,
    // if the value < debounce start then it can call the onPersist callback
    // for the host application to write to disk
    this.redlock.lock(`${this.getKey(document.name)}:lock`, ttl, async (err, lock) => {
      if (err || !lock) {
        // could not acquire lock, expected behavior.
        return
      }

      const result = await this.redis.get(this.updatedKey(document.name))
      const updatedTime = result ? Date.parse(result) : undefined

      if (updatedTime && updatedTime < Date.now() - this.configuration.persistWait) {
        if (this.configuration.onPersist) {
          this.configuration.onPersist(document)
        }
      }

      lock.unlock(err => {
        // we weren't able to reach redis; the lock will expire after ttl
        console.error(err)
      })
    })
  }

  /**
   * Handle awareness update messages received directly by this hocuspocus instance.
  */
  private handleAwarenessUpdate(document: Document) {
    return async () => {
      const message = new OutgoingMessage()
        .createAwarenessUpdateMessage(document.awareness)

      await this.redis.publishBuffer(this.pubKey(document.name), Buffer.from(message.toUint8Array()))
    }
  }

  /**
   * Handle document update messages received directly by this hocuspocus instance.
  */
  private handleUpdate(document: Document) {
    return async (update: Uint8Array) => {
      this.configuration.log('publishing local update')

      const message = new OutgoingMessage()
        .createSyncMessage()
        .writeUpdate(update)

      // forward all update messages received to redis channel
      await this.redis.publishBuffer(this.pubKey(document.name), Buffer.from(message.toUint8Array()))

      // update the lastReceivedTimestamp in a Redis key for documentName if source is this server.
      await this.redis.set(this.updatedKey(document.name), new Date().toISOString())

      // When a node receives an update event from the client or another server it sets an in memory debounce (eg 3 seconds)
      this.debouncedUpdate(document)
    }
  }

  /**
   * Handle incoming messages published on all subscribed document channels.
   * Note that this will also include messages from ourselves as it is not possible
   * in redis to filter these.
  */
  private handleIncomingMessage = async (channel: Buffer, pattern: Buffer, data: Buffer) => {
    const channelName = pattern.toString()
    const [_, documentName, instanceName] = channelName.split(':')
    const document = this.documents.get(documentName)

    if (instanceName === this.configuration.instanceName) {
      return
    }

    if (!document) {
      return
    }

    new MessageReceiver(
      new IncomingMessage(data),
    ).apply(document, reply => {
      return this.redis.publishBuffer(this.pubKey(document.name), Buffer.from(reply))
    })
  }

  private getKey(documentName: string) {
    return `${this.configuration.namespace}:${documentName}`
  }

  private pubKey(documentName: string) {
    return `${this.getKey(documentName)}:${this.configuration.instanceName.replace(/:/g, '')}`
  }

  private subKey(documentName: string) {
    return `${this.getKey(documentName)}:*`
  }

  private updatedKey(documentName: string) {
    return `${this.getKey(documentName)}:updated`
  }
}
