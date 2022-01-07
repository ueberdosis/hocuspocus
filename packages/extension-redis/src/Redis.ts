import RedisClient from 'ioredis'
import Redlock from 'redlock'
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
  onAwarenessUpdatePayload,
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
   * The maximum time for the Redis lock in ms (in case it can’t be released).
   */
  lockTimeout: number,
}

export class Redis implements Extension {
  configuration: Configuration = {
    port: 6379,
    host: '127.0.0.1',
    prefix: 'hocuspocus',
    identifier: `host-${uuid()}`,
    lockTimeout: 1000,
  }

  pub: RedisClient.Redis

  sub: RedisClient.Redis

  documents = new Map()

  redlock: Redlock

  locks = new Map<string, Redlock.Lock>()

  public constructor(configuration: Partial<Configuration>) {
    const { port, host, options } = configuration
    this.configuration = {
      ...this.configuration,
      ...configuration,
    }

    this.pub = new RedisClient(port, host, options)

    this.sub = new RedisClient(port, host, options)
    this.sub.on('pmessageBuffer', this.handleIncomingMessage)

    this.redlock = new Redlock([this.pub])
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

  private lockKey(documentName: string) {
    return `${this.getKey(documentName)}:lock`
  }

  /**
   * Once a document is laoded, subscribe to the channel in Redis.
   */
  public async afterLoadDocument({ documentName, document, instance }: afterLoadDocumentPayload) {
    this.documents.set(documentName, document)

    return new Promise((resolve, reject) => {
      // On document creation the node will connect to pub and sub channels
      // for the document.
      this.sub.psubscribe(this.subKey(documentName), async error => {
        if (error) {
          reject(error)
          return
        }

        this.publishFirstSyncStep(documentName, document)
        this.requestAwarenessFromOtherInstances(documentName)

        resolve(undefined)
      })
    })
  }

  /**
   * Publish the first sync step through Redis.
   */
  private async publishFirstSyncStep(documentName: string, document: Document) {
    const syncMessage = new OutgoingMessage()
      .createSyncMessage()
      .writeFirstSyncStepFor(document)

    return this.pub.publishBuffer(this.pubKey(documentName), Buffer.from(syncMessage.toUint8Array()))
  }

  /**
   * Let’s ask Redis who is connected already.
   */
  private async requestAwarenessFromOtherInstances(documentName: string) {
    const awarenessMessage = new OutgoingMessage()
      .writeQueryAwareness()

    return this.pub.publishBuffer(
      this.pubKey(documentName),
      Buffer.from(awarenessMessage.toUint8Array()),
    )
  }

  /**
   * Before the document is stored, make sure to set a lock in Redis.
   * That’s meant to avoid conflicts with other instances trying to store the document.
   */
  async onStoreDocument({ document, documentName, instance }: onStoreDocumentPayload) {
    // Attempt to acquire a lock and read lastReceivedTimestamp from Redis,
    // if the value < debounce start then it can call the onPersist callback
    // for the host application to write to disk
    return new Promise((resolve, reject) => {
      this.redlock.lock(this.lockKey(documentName), this.configuration.lockTimeout, async (error, lock) => {
        if (error || !lock) {
          // Expected behavior: Could not acquire lock,
          // another instance locked it already.
          reject()
          return
        }

        this.locks.set(this.lockKey(documentName), lock)

        if (!this.configuration.onPersist) {
          resolve(undefined)
          return
        }

        await this.configuration.onPersist({
          document,
          identifier: this.configuration.identifier,
        })

        resolve(undefined)
      })
    })
  }

  /**
   * Release the Redis lock, so other instances can store documents.
   */
  async afterStoreDocument({ documentName, instance }: afterStoreDocumentPayload) {
    this.locks.get(this.lockKey(documentName))?.unlock()
      .catch(() => {
        console.error(`Not able to unlock Redis. The lock will expire after ${this.configuration.lockTimeout}ms.`)
      })
      .finally(() => {
        this.locks.delete(this.lockKey(documentName))
      })
  }

  /**
   * Handle awareness update messages received directly by this Hocuspocus instance.
   */
  async onAwarenessUpdate({ documentName, awareness }: onAwarenessUpdatePayload) {
    const message = new OutgoingMessage()
      .createAwarenessUpdateMessage(awareness)

    return this.pub.publishBuffer(
      this.pubKey(documentName),
      Buffer.from(message.toUint8Array()),
    )
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
      return this.pub.publishBuffer(
        this.pubKey(document.name),
        Buffer.from(reply),
      )
    })
  }

  /**
   * Make sure to *not* listen for further changes, when there’s
   * noone connected anymore.
   */
  public onDisconnect = async ({ documentName, clientsCount, instance }: onDisconnectPayload) => {
    // Do nothing, when other users are still connected to the document.
    if (clientsCount > 0) {
      return
    }

    // It was indeed the last connected user.
    this.documents.delete(documentName)

    // Time to end the subscription on the document channel.
    this.sub.punsubscribe(this.subKey(documentName), error => {
      if (error) {
        console.error(error)
      }
    })
  }

  /**
   * Kill the Redlock connection immediately.
   */
  async onDestroy() {
    this.redlock.quit()
  }
}
