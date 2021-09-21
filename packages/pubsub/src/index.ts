// @flow
import Redis from 'ioredis'
import debounce from 'lodash.debounce'
import * as Y from 'yjs'
import {
  OutgoingMessage, Document, AwarenessUpdate, Connection, Extension, onChangePayload, onCreateDocumentPayload, onDisconnectPayload,
} from '@hocuspocus/server'
import { applyAwarenessUpdate } from 'y-protocols/awareness'

export interface Configuration {
  port: number,
  host: string,
  redisOpts: Redis.RedisOptions,
  namespace: string,
  persistWait: number,
  maxWait: number,
  onPersist: (ydoc: Y.Doc) => Promise<void> | void,
}

export default class PubSub implements Extension {
  configuration: Partial<Configuration> = {
    namespace: 'hocuspocus',
  }

  pub: Redis.Redis | Redis.Cluster;

  sub: Redis.Redis;

  documents = new Map()

  constructor(configuration: Partial<Configuration>) {
    const { port, host, redisOpts } = configuration
    this.configuration = {
      ...this.configuration,
      ...configuration,
    }

    this.pub = new Redis(port, host, redisOpts)
    this.sub = new Redis(port, host, redisOpts)
    this.sub.on('messageBuffer', this.handleMessage)
  }

  async onCreateDocument({
    documentName,
    document,
  }: onCreateDocumentPayload) {
    this.documents.set(documentName, document)

    // On document creation the node will connect to pub and sub channels
    this.sub.psubscribe(`${this.getKey(documentName)}*`, err => {
      if (err) {
        throw err
      }
      // this.configuration.log?.info(`Subscribed to ${documentName}`)
    })

    document.awareness.on('update', this.handleAwarenessUpdate(document))
    document.on('update', this.handleUpdate(document))

    // broadcast sync step 1
    const syncMessage = (new OutgoingMessage()
      .createSyncMessage()
      .writeFirstSyncStepFor(document))

    const update = syncMessage.toUint8Array()
    await this.pub.publishBuffer(this.getKey(documentName), Buffer.from(update))
  }

  async onDisconnect({ documentName, clientsCount }: onDisconnectPayload) {
    // Still clients connected?
    if (clientsCount > 0) {
      return
    }

    this.documents.delete(documentName)

    // on final connection close sub channel
    this.sub.unsubscribe(this.getKey(documentName), err => {
      if (err) {
        // this.configuration.log?.error(err)

      }
      // this.configuration.log?.info(`Unsubscribed from ${documentName}`)
    })
  }

  private handleAwarenessUpdate(document: Document) {
    return async () => {
      const awarenessMessage = new OutgoingMessage()
        .createAwarenessUpdateMessage(document.awareness)

      const update = awarenessMessage.toUint8Array()
      await this.pub.publishBuffer(`${this.getKey(document.name)}:awareness`, Buffer.from(update))
    }
  }

  private handleUpdate(document: Document) {
    return async (update: Uint8Array) => {

      // forward all update messages received to pub channel
      await this.pub.publishBuffer(this.getKey(document.name), Buffer.from(update))

      // update the lastReceivedTimestamp in a Redis key for documentName if source is this server.
      // await this.pub.set(`${this.getKey(document.name)}:updated`, new Date().toISOString())

      // When a node receives an update event from the client or another server it sets an in memory debounce (eg 3 seconds)
      this.debouncedUpdate(document, update)
    }
  }

  debouncedUpdate = debounce(
    (document, update) => {
      // attempt to acquire a lock and read lastReceivedTimestamp from Redis,
      // if the value < debounce start then it can call the onPersist callback
      // for the host application to write to disk
    },
    3000,
  );

  async handleMessage(channel: Buffer, update: Buffer) {
    const channelName = channel.toString()
    const [_, documentName, type] = channelName.split(':')
    const document = this.documents.get(documentName)
    if (!document) {
      console.log(`No document in memory for ${channel}`)
      return
    }

    // TODO: Remove assumption
    if (type === 'awareness') {
      applyAwarenessUpdate(document.awareness, update, undefined)
    } else {
      document.emit('update', update)
    }
  }

  getKey(documentName: string) {
    return `${this.configuration.namespace}:${documentName}`
  }
}
