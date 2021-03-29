import { defaultExtensions } from '@tiptap/starter-kit'
import { Logger } from '../../../packages/logger/src'
import { RocksDB } from '../../../packages/rocksdb/src'
import { TiptapTransformer } from '../../../packages/transformer/src'
import { Server, onCreateDocumentPayload } from '../../../packages/server/src'

const server = Server.configure({
  port: 1234,
  throttle: false,

  extensions: [
    new Logger(),
    new RocksDB(),
  ],

  async onCreateDocument(data: onCreateDocumentPayload) {
    // eslint-disable-next-line no-underscore-dangle
    if (data.document.get('default')._start) {
      return
    }

    const ydoc = TiptapTransformer.toYdoc(
      {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'What is love?',
              },
            ],
          },
        ],
      },
      defaultExtensions(),
      'default',
    )

    return ydoc
  },
})

server.listen()
