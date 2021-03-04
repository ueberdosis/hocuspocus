import osu from 'node-os-utils'
import process from 'process'
import moment from 'moment'
import {
  defaultConfiguration,
  Configuration,
  onConnectPayload,
  onDisconnectPayload,
  onCreateDocumentPayload,
  onChangePayload,
} from '@hocuspocus/server'
import {
  AbstractType,
  Doc,
  encodeStateAsUpdate,
  YEvent,
} from 'yjs'

export class Collector {

  serverConfiguration: Partial<Configuration> = defaultConfiguration

  connections = 0

  messages = 0

  documents = 0

  async memory() {
    const memory = await osu.mem.info()

    return {
      free: memory.freeMemMb,
      total: memory.totalMemMb,
      usage: 100 - memory.freeMemPercentage,
    }
  }

  async cpu() {
    return {
      count: osu.cpu.count(),
      model: osu.cpu.model(),
      usage: await osu.cpu.usage(),
    }
  }

  connect(data: onConnectPayload) {
    const { documentName, socketId } = data

    this.connections += 1

    return {
      action: 'connected',
      documentName,
      socketId,
    }
  }

  disconnect(data: onDisconnectPayload) {
    const { documentName, socketId } = data

    this.connections -= 1

    return {
      action: 'disconnected',
      documentName,
      socketId,
    }
  }

  connectionCount() {
    return {
      count: this.connections,
    }
  }

  createDocument(data: onCreateDocumentPayload) {
    const { documentName, document, socketId } = data

    this.documents += 1

    return {
      action: 'created',
      document: Collector.readableYDoc(document),
      documentName,
      socketId,
    }
  }

  changeDocument(data: onChangePayload) {
    const { documentName, document, socketId } = data

    this.messages += 1

    return {
      action: 'changed',
      document: Collector.readableYDoc(document),
      documentName,
      socketId,
    }
  }

  messageCount() {
    const count = this.messages
    this.messages = 0

    return { count }
  }

  documentCount() {
    return {
      count: this.documents,
    }
  }

  info() {
    return {
      configuration: this.serverConfiguration,
      platform: process.platform,
      started: moment().subtract(process.uptime(), 'second').toISOString(),
      version: process.version,
    }
  }

  private static readableYDoc(doc: Doc): any {
    const data = {}

    doc.share?.forEach((item, key) => {
      // TODO: fix crapcode
      // @ts-ignore
      // eslint-disable-next-line no-underscore-dangle
      // const type = item._start?.content?.type?.constructor?.name
      //
      // const handlers = {
      //   YXmlElement() {
      //     return doc.getXmlFragment(key).toJSON()
      //   },
      // }
      //
      // // @ts-ignore
      // data[key] = handlers[type] ? handlers[type]() : null
    })

    return data
  }

}
