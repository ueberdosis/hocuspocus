import { defaultExtensions } from '@tiptap/starter-kit'
import { Logger } from '../../../packages/logger/src'
import { RocksDB } from '../../../packages/rocksdb/src'
import { TiptapTransformer } from '../../../packages/transformer/src'
import { Server, onCreateDocumentPayload } from '../../../packages/server/src'

const generateProsemirrorJson = (text: string) => {
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
  throttle: false,

  extensions: [
    new Logger(),
    new RocksDB(),
  ],

  async onCreateDocument(data: onCreateDocumentPayload) {
    if (data.document.isEmpty('default')) {
      const defaultField = TiptapTransformer.toYdoc(
        generateProsemirrorJson('What is love?'), defaultExtensions(), 'default',
      )

      data.document.merge(defaultField)
    }

    if (data.document.isEmpty('secondary')) {
      const secondaryField = TiptapTransformer.toYdoc(
        generateProsemirrorJson('Baby don\'t hurt me…'), defaultExtensions(), 'secondary',
      )

      data.document.merge(secondaryField)
    }

    return data.document
  },
})

server.listen()
