import RedisClient, { ClusterNode, ClusterOptions, RedisOptions } from 'ioredis'
import Redlock from 'redlock'
import { v4 as uuid } from 'uuid'
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
  onChangePayload,
  MessageReceiver,
  Debugger,
  onConfigurePayload,
  beforeBroadcastStatelessPayload, Hocuspocus,
} from '@hocuspocus/server'

export type RedisInstance = RedisClient.Cluster | RedisClient.Redis

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
   * Redis Cluster
   */
  nodes?: ClusterNode[],
  /**
   * Duplicate from an existed Redis instance
   */
  redis?: RedisInstance,
  /**
   * Redis instance creator
   */
  createClient?: () => RedisInstance,
  /**
   * Options passed directly to Redis constructor
   *
   * https://github.com/luin/ioredis/blob/master/API.md#new-redisport-host-options
   */
  options?: ClusterOptions | RedisOptions,
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
   * The maximum time for the Redis lock in ms (in case it can’t be released).
   */
  lockTimeout: number,
  /**
   * A delay before onDisconnect is executed. This allows last minute updates'
   * sync messages to be received by the subscription before it's closed.
   */
  disconnectDelay: number,
}

export class Redis implements Extension {
  /**
   * Make sure to give that extension a higher priority, so
   * the `onStoreDocument` hook is able to intercept the chain,
   * before documents are stored to the database.
   */
  priority = 1000

  configuration: Configuration = {
    port: 6379,
    host: '127.0.0.1',
    prefix: 'hocuspocus',
    identifier: `host-${uuid()}`,
    lockTimeout: 1000,
    disconnectDelay: 1000,
  }

  pub: RedisInstance

  sub: RedisInstance

  instance!: Hocuspocus

  redlock: Redlock

  locks = new Map<string, Redlock.Lock>()

  logger: Debugger

  public constructor(configuration: Partial<Configuration>) {
    this.configuration = {
      ...this.configuration,
      ...configuration,
    }

    // We’ll replace that in the onConfigure hook with the global instance.
    this.logger = new Debugger()

    // Create Redis instance
    const {
      port,
      host,
      options,
      nodes,
      redis,
      createClient,
    } = this.configuration

    if (typeof createClient === 'function') {
      this.pub = createClient()
      this.sub = createClient()
    } else if (redis) {
      this.pub = redis.duplicate()
      this.sub = redis.duplicate()
    } else if (nodes && nodes.length > 0) {
      this.pub = new RedisClient.Cluster(nodes, options)
      this.sub = new RedisClient.Cluster(nodes, options)
    } else {
      this.pub = new RedisClient(port, host, options)
      this.sub = new RedisClient(port, host, options)
    }
    this.sub.on('pmessageBuffer', this.handleIncomingMessage)

    this.redlock = new Redlock([this.pub])
  }

  async onConfigure({ instance }: onConfigurePayload) {
    this.logger = instance.debugger
    this.instance = instance
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
  public async afterLoadDocument({ documentName, document }: afterLoadDocumentPayload) {
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
    const syncMessage = new OutgoingMessage(documentName)
      .createSyncMessage()
      .writeFirstSyncStepFor(document)

    return this.pub.publishBuffer(this.pubKey(documentName), Buffer.from(syncMessage.toUint8Array()))
  }

  /**
   * Let’s ask Redis who is connected already.
   */
  private async requestAwarenessFromOtherInstances(documentName: string) {
    const awarenessMessage = new OutgoingMessage(documentName)
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
  async onStoreDocument({ documentName }: onStoreDocumentPayload) {
    // Attempt to acquire a lock and read lastReceivedTimestamp from Redis,
    // to avoid conflict with other instances storing the same document.
    return new Promise((resolve, reject) => {
      this.redlock.lock(this.lockKey(documentName), this.configuration.lockTimeout, async (error, lock) => {
        if (error || !lock) {
          // Expected behavior: Could not acquire lock, another instance locked it already.
          // No further `onStoreDocument` hooks will be executed.
          reject()
          return
        }

        this.locks.set(this.lockKey(documentName), lock)

        resolve(undefined)
      })
    })
  }

  /**
   * Release the Redis lock, so other instances can store documents.
   */
  async afterStoreDocument({ documentName }: afterStoreDocumentPayload) {
    this.locks.get(this.lockKey(documentName))?.unlock()
      .catch(() => {
        // Not able to unlock Redis. The lock will expire after ${lockTimeout} ms.
        // console.error(`Not able to unlock Redis. The lock will expire after ${this.configuration.lockTimeout}ms.`)
      })
      .finally(() => {
        this.locks.delete(this.lockKey(documentName))
      })
  }

  /**
   * Handle awareness update messages received directly by this Hocuspocus instance.
   */
  async onAwarenessUpdate({
    documentName, awareness, added, updated, removed,
  }: onAwarenessUpdatePayload) {
    const changedClients = added.concat(updated, removed)
    const message = new OutgoingMessage(documentName)
      .createAwarenessUpdateMessage(awareness, changedClients)

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
    const message = new IncomingMessage(data)
    // we don't need the documentName from the message, we are just taking it from the redis channelName.
    // we have to immediately write it back to the encoder though, to make sure the structure of the message is correct
    message.writeVarString(message.readVarString())

    const channelName = pattern.toString()
    const [_, documentName, identifier] = channelName.split(':')
    const document = this.instance.documents.get(documentName)

    if (identifier === this.configuration.identifier) {
      return
    }

    if (!document) {
      return
    }

    new MessageReceiver(
      message,
      this.logger,
    ).apply(document, undefined, reply => {
      return this.pub.publishBuffer(
        this.pubKey(document.name),
        Buffer.from(reply),
      )
    })
  }

  /**
   * if the ydoc changed, we'll need to inform other Hocuspocus servers about it.
   */
  public async onChange(data: onChangePayload): Promise<any> {
    return this.publishFirstSyncStep(data.documentName, data.document)
  }

  /**
   * Make sure to *not* listen for further changes, when there’s
   * noone connected anymore.
   */
  public onDisconnect = async ({ documentName }: onDisconnectPayload) => {
    const disconnect = () => {
      const document = this.instance.documents.get(documentName)

      // Do nothing, when other users are still connected to the document.
      if (document && document.getConnectionsCount() > 0) {
        return
      }

      // Time to end the subscription on the document channel.
      this.sub.punsubscribe(this.subKey(documentName), (error: any) => {
        if (error) {
          console.error(error)
        }
      })
    }
    // Delay the disconnect procedure to allow last minute syncs to happen
    setTimeout(disconnect, this.configuration.disconnectDelay)
  }

  async beforeBroadcastStateless(data: beforeBroadcastStatelessPayload) {
    const message = new OutgoingMessage(data.documentName)
      .writeBroadcastStateless(data.payload)

    return this.pub.publishBuffer(
      this.pubKey(data.documentName),
      Buffer.from(message.toUint8Array()),
    )
  }

  /**
   * Kill the Redlock connection immediately.
   */
  async onDestroy() {
    await this.redlock.quit()
    this.pub.disconnect(false)
    this.sub.disconnect(false)
  }
}
