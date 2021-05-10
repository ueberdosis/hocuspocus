import { defaultExtensions } from '@tiptap/starter-kit'
import { Logger } from '../../../packages/logger/src'
import { RocksDB } from '../../../packages/rocksdb/src'
import { TiptapTransformer } from '../../../packages/transformer/src'
import { Server, onCreateDocumentPayload } from '../../../packages/server/src'

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

  async onCreateDocument(data: onCreateDocumentPayload) {
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
