// @flow
import Redis from 'ioredis'
import Redlock from 'redlock'
import debounce from 'lodash.debounce'
import * as Y from 'yjs'
import {
  IncomingMessage,
  OutgoingMessage,
  Document,
  Extension,
  onCreateDocumentPayload,
  onDisconnectPayload,
} from '@hocuspocus/server'
import { MessageReceiver } from './MessageReceiver'

export interface Configuration {
  port: number,
  host: string,
  redisOpts?: Redis.RedisOptions,
  namespace: string,
  persistWait: number,
  onPersist?: (ydoc: Y.Doc) => Promise<void> | void,
  log: (...args: any[]) => void,
}

export class PubSub implements Extension {
  configuration: Configuration = {
    port: 6379,
    host: 'localhost',
    namespace: 'hocuspocus',
    persistWait: 3000,
    log: console.log, // eslint-disable-line
  }

  redis: Redis.Redis | Redis.Cluster;

  sub: Redis.Redis;

  redlock: Redlock;

  documents = new Map()

  debouncedUpdate: (document: Document) => void

  constructor(configuration: Partial<Configuration>) {
    const { port, host, redisOpts } = configuration
    this.configuration = {
      ...this.configuration,
      ...configuration,
    }

    this.redis = new Redis(port, host, redisOpts)
    this.sub = new Redis(port, host, redisOpts)
    this.redlock = new Redlock([this.redis])
    this.sub.on('messageBuffer', this.handleMessage)

    // debounced handler should be setup here in the constructor so that the
    // wait time can be configurable
    this.debouncedUpdate = debounce(
      document => {
        const ttl = 1000

        // attempt to acquire a lock and read lastReceivedTimestamp from Redis,
        // if the value < debounce start then it can call the onPersist callback
        // for the host application to write to disk
        this.redlock.lock(`${this.getKey(document.name)}:lock`, ttl, async (err, lock) => {
          if (err || !lock) {
            // could not acquire lock, expected behavior.
            return
          }

          const result = await this.redis.get(`${this.getKey(document.name)}:updated`)
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
      },
      this.configuration.persistWait,
    )
  }

  async onCreateDocument({
    documentName,
    document,
  }: onCreateDocumentPayload) {
    this.documents.set(documentName, document)

    return new Promise((resolve, reject) => {
      // On document creation the node will connect to redis and sub channels
      this.sub.subscribe(this.getKey(documentName), async err => {
        if (err) {
          reject(err)
          return
        }

        this.configuration.log('subscribed', documentName)

        document.awareness.on('update', this.handleAwarenessUpdate(document))
        document.on('update', this.handleUpdate(document))

        // broadcast sync step 1
        const syncMessage = (new OutgoingMessage()
          .createSyncMessage()
          .writeFirstSyncStepFor(document))

        const update = syncMessage.toUint8Array()

        this.configuration.log('publish sync step 1')
        await this.redis.publishBuffer(this.getKey(documentName), Buffer.from(update))
        resolve(undefined)
      })
    })
  }

   onDisconnect = async ({ documentName, clientsCount }: onDisconnectPayload) => {
     // Still clients connected?
     if (clientsCount > 0) {
       return
     }

     this.configuration.log('last disconnect', documentName)

     this.documents.delete(documentName)

     // on final connection close sub channel
     this.sub.unsubscribe(this.getKey(documentName), err => {
       if (err) {
         console.error(err)
         return
       }
       this.configuration.log(`Unsubscribed from ${documentName}`)
     })
   }

   private handleAwarenessUpdate(document: Document) {
     return async () => {
       const message = new OutgoingMessage()
         .createAwarenessUpdateMessage(document.awareness)

       await this.redis.publishBuffer(this.getKey(document.name), Buffer.from(message.toUint8Array()))
     }
   }

   private handleUpdate(document: Document) {
     return async (update: Uint8Array) => {
       this.configuration.log('publishing local update')

       const message = new OutgoingMessage()
         .createSyncMessage()
         .writeUpdate(update)

       // forward all update messages received to redis channel
       await this.redis.publishBuffer(this.getKey(document.name), Buffer.from(message.toUint8Array()))

       // update the lastReceivedTimestamp in a Redis key for documentName if source is this server.
       await this.redis.set(`${this.getKey(document.name)}:updated`, new Date().toISOString())

       // When a node receives an update event from the client or another server it sets an in memory debounce (eg 3 seconds)
       this.debouncedUpdate(document)
     }
   }

  handleMessage = async (channel: Buffer, data: Buffer) => {
    const channelName = channel.toString()
    this.configuration.log('received remote message', channelName)
    const [_, documentName] = channelName.split(':')
    const document = this.documents.get(documentName)

    if (!document) {
      this.configuration.log(`No document in memory for ${channel}`)
      return
    }

    new MessageReceiver(
      new IncomingMessage(data),
    ).apply(document, async reply => {
      // TODO: Need to filter messages from this server
      // await this.redis.publishBuffer(this.getKey(document.name), Buffer.from(reply))
    })
  }

  getKey(documentName: string) {
    return `${this.configuration.namespace}:${documentName}`
  }
}
