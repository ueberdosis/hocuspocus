import { Logger } from '../../../packages/extension-logger/src'
import { RocksDB } from '../../../packages/extension-rocksdb/src'
import { TiptapTransformer } from '../../../packages/transformer/src'
import { Server, onLoadDocumentPayload } from '../../../packages/server/src'

const getProseMirrorJSON = (text: string) => {
  return {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text,
          },
        ],
      },
    ],
  }
}

const server = Server.configure({
  port: 1234,
  extensions: [
    new Logger(),
    new RocksDB(),
  ],

  async onConnect(data) {
    await new Promise(resolve => setTimeout(() => {
      // @ts-ignore
      resolve()
    }, 1337))
  },

  async onLoadDocument(data: onLoadDocumentPayload) {
    if (data.document.isEmpty('default')) {
      const defaultField = TiptapTransformer.toYdoc(
        getProseMirrorJSON('What is love?'),
        'default',
      )

      data.document.merge(defaultField)
    }

    if (data.document.isEmpty('secondary')) {
      const secondaryField = TiptapTransformer.toYdoc(
        getProseMirrorJSON('Baby don\'t hurt me…'),
        'secondary',
      )

      data.document.merge(secondaryField)
    }

    return data.document
  },
})

server.listen()
