import os from 'os'
import RedisClient from 'ioredis'
import Redlock from 'redlock'
import debounce from 'lodash.debounce'
import * as Y from 'yjs'
import {
  IncomingMessage,
  OutgoingMessage,
  Document,
  Extension,
  onLoadedDocumentPayload,
  onDisconnectPayload,
} from '@hocuspocus/server'
import { MessageReceiver } from './MessageReceiver'

export interface Configuration {
  /**
   * Redis port
   */
  port: number,
  /**
   * Redis host
   */
  host: string,
  /**
   * Options passed directly to Redis constructor
   *
   * https://github.com/luin/ioredis/blob/master/API.md#new-redisport-host-options
   */
  options?: RedisClient.RedisOptions,
  /**
   * An unique instance name, required to filter messages in Redis.
   * If none is provided the os hostname is used.
   */
  identifier: string,
  /**
   * Namespace for Redis keys, if none is provided 'hocuspocus' is used
   */
  prefix: string,
  /**
   * The period of time to wait between calling onPersist, you should choose a balance between reliability and load
   */
  persistWait: number,
  /**
   * onPersist callback will be called debounced persistWait seconds after the last document update
   */
  onPersist?: ({ document, identifier }: { document: Y.Doc, identifier: string }) => Promise<void> | void,
  /**
   * A log function, if none is provided output will go to console
   */
  log: (...args: any[]) => void,
}

export class Redis implements Extension {
  configuration: Configuration = {
    port: 6379,
    host: '127.0.0.1',
    prefix: 'hocuspocus',
    identifier: os.hostname(),
    persistWait: 3000,
    log: console.log, // eslint-disable-line
  }

  publisher: RedisClient.Redis

  subscriber: RedisClient.Redis

  redlock: Redlock

  documents = new Map()

  debouncedUpdate: (document: Document) => void

  public constructor(configuration: Partial<Configuration>) {
    const { port, host, options } = configuration
    this.configuration = {
      ...this.configuration,
      ...configuration,
    }

    this.publisher = new RedisClient(port, host, options)
    this.redlock = new Redlock([this.publisher])

    this.subscriber = new RedisClient(port, host, options)
    this.subscriber.on('pmessageBuffer', this.handleIncomingMessage)

    // debounced handler should be setup here in the constructor so that the
    // wait time can be configurable
    this.debouncedUpdate = debounce(
      this.handlePersistDocument,
      this.configuration.persistWait,
    )
  }

  public async onLoadedDocument({
    documentName,
    document,
  }: onLoadedDocumentPayload) {
    this.documents.set(documentName, document)

    return new Promise((resolve, reject) => {
      // On document creation the node will connect to pub and sub channels
      // for the document.
      this.subscriber.psubscribe(this.subKey(documentName), async error => {
        if (error) {
          reject(error)
          return
        }

        this.configuration.log('subscribed', this.subKey(documentName))

        document.on('update', this.handleUpdate(document))
        this.publishFirstSyncStep(documentName, document)

        document.awareness.on('update', this.handleAwarenessUpdate(document))
        this.requestAwarenessFromOtherInstances(documentName)

        resolve(undefined)
      })
    })
  }

  private async publishFirstSyncStep(documentName: string, document: Document) {
    const syncMessage = new OutgoingMessage()
      .createSyncMessage()
      .writeFirstSyncStepFor(document)

    return this.publisher.publishBuffer(this.pubKey(documentName), Buffer.from(syncMessage.toUint8Array()))
  }

  private async requestAwarenessFromOtherInstances(documentName: string) {
    const awarenessMessage = new OutgoingMessage()
      .writeQueryAwareness()

    return this.publisher.publishBuffer(
      this.pubKey(documentName),
      Buffer.from(awarenessMessage.toUint8Array()),
    )
  }

  public onDisconnect = async ({ documentName, clientsCount }: onDisconnectPayload) => {
    // Still clients connected?
    if (clientsCount > 0) {
      return
    }

    this.configuration.log('last disconnect', documentName)

    this.documents.delete(documentName)

    // on final connection close sub channel
    this.subscriber.punsubscribe(this.subKey(documentName), error => {
      if (error) {
        console.error(error)
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
    this.redlock.lock(`${this.getKey(document.name)}:lock`, ttl, async (error, lock) => {
      if (error || !lock) {
        // could not acquire lock, expected behavior.
        return
      }

      const result = await this.publisher.get(this.updatedKey(document.name))
      const updatedTime = result ? Date.parse(result) : undefined

      if (updatedTime && updatedTime < Date.now() - this.configuration.persistWait) {
        if (this.configuration.onPersist) {
          this.configuration.onPersist({
            document,
            identifier: this.configuration.identifier,
          })
        }
      }

      lock.unlock(error => {
        console.error(`I’m not able to reach Redis. The lock will expire after ${ttl}ms.`)

        if (error) {
          console.error(` - Error: ${error}`)
        }
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

      await this.publisher.publishBuffer(this.pubKey(document.name), Buffer.from(message.toUint8Array()))
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
      await this.publisher.publishBuffer(this.pubKey(document.name), Buffer.from(message.toUint8Array()))

      // update the lastReceivedTimestamp in a Redis key for documentName if source is this server.
      await this.publisher.set(this.updatedKey(document.name), new Date().toISOString())

      // When a node receives an update event from the client or another server it sets an in memory debounce (eg 3 seconds)
      this.debouncedUpdate(document)
    }
  }

  /**
   * Handle incoming messages published on all subscribed document channels.
   * Note that this will also include messages from ourselves as it is not possible
   * in Redis to filter these.
  */
  private handleIncomingMessage = async (channel: Buffer, pattern: Buffer, data: Buffer) => {
    const channelName = pattern.toString()
    const [_, documentName, identifier] = channelName.split(':')
    const document = this.documents.get(documentName)

    if (identifier === this.configuration.identifier) {
      return
    }

    if (!document) {
      return
    }

    new MessageReceiver(
      new IncomingMessage(data),
    ).apply(document, reply => {
      return this.publisher.publishBuffer(
        this.pubKey(document.name),
        Buffer.from(reply),
      )
    })
  }

  private getKey(documentName: string) {
    return `${this.configuration.prefix}:${documentName}`
  }

  private pubKey(documentName: string) {
    return `${this.getKey(documentName)}:${this.configuration.identifier.replace(/:/g, '')}`
  }

  private subKey(documentName: string) {
    return `${this.getKey(documentName)}:*`
  }

  private updatedKey(documentName: string) {
    return `${this.getKey(documentName)}:updated`
  }

  async onDestroy() {
    this.redlock.quit()
  }
}
