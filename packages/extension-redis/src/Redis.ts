import RedisClient from 'ioredis'
import Redlock from 'redlock'
import debounce from 'lodash.debounce'
import { v4 as uuid } from 'uuid'
import * as Y from 'yjs'
import {
  IncomingMessage,
  OutgoingMessage,
  Document,
  Extension,
  afterLoadDocumentPayload,
  afterStoreDocumentPayload,
  onDisconnectPayload,
  onStoreDocumentPayload,
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
   * If none is provided an unique id is generated.
   */
  identifier: string,
  /**
   * Namespace for Redis keys, if none is provided 'hocuspocus' is used
   */
  prefix: string,
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
    identifier: `host-${uuid()}`,
    log: console.log, // eslint-disable-line
  }

  publisher: RedisClient.Redis

  subscriber: RedisClient.Redis

  documents = new Map()

  redlock: Redlock

  locks = new Map<string, Redlock.Lock>()

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
  }

  public async afterLoadDocument({ documentName, document }: afterLoadDocumentPayload) {
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

        // document.on('update', this.handleUpdate(document))
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

  async onStoreDocument({ document, documentName, instance }: onStoreDocumentPayload) {
    const ttl = 1000
    const key = `${this.getKey(documentName)}:lock`
    // console.log(`[${instance.configuration.name}] Lock ${key}…`)

    // Attempt to acquire a lock and read lastReceivedTimestamp from Redis,
    // if the value < debounce start then it can call the onPersist callback
    // for the host application to write to disk
    this.redlock.lock(key, ttl, async (error, lock) => {
      if (error || !lock) {
        // Expected behavior: Could not acquire lock,
        // another instance locked it already.
        throw new Error(error)
      }

      this.locks.set(key, lock)

      if (!this.configuration.onPersist) {
        return
      }

      // console.log(`[${instance.configuration.name}] Persist!`)
      return this.configuration.onPersist({
        document,
        identifier: this.configuration.identifier,
      })
    })
  }

  async afterStoreDocument({ documentName, instance }: afterStoreDocumentPayload) {
    // TODO: Move to configuration
    const ttl = 1000
    const key = `${this.getKey(documentName)}:lock`
    // console.log(`[${instance.configuration.name}] Unlocking ${key}`)

    this.locks.get(key)?.unlock()
      .catch(error => {
        console.error(`I’m not able to unlock Redis. The lock will expire after ${ttl}ms.`)

        if (error) {
          console.error(` - Error: ${error}`)
        }
      })
      .finally(() => {
        this.locks.delete(key)
      })
  }

  /**
   * Handle awareness update messages received directly by this Hocuspocus instance.
  */
  private handleAwarenessUpdate(document: Document) {
    return async () => {
      const message = new OutgoingMessage()
        .createAwarenessUpdateMessage(document.awareness)

      await this.publisher.publishBuffer(this.pubKey(document.name), Buffer.from(message.toUint8Array()))
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
