import { getSchema } from '@tiptap/core'
import { defaultExtensions } from '@tiptap/starter-kit'
import { prosemirrorJSONToYDoc } from 'y-prosemirror'

import { Logger } from '../../../packages/logger/src'
import { RocksDB } from '../../../packages/rocksdb/src'
import { Server, onCreateDocumentPayload } from '../../../packages/server/src'

const server = Server.configure({
  port: 1234,
  throttle: false,

  extensions: [
    new Logger(),
    new RocksDB(),
  ],

  async onCreateDocument(data: onCreateDocumentPayload) {
    const fieldName = 'default'

    if (data.document.get(fieldName)._start) {
      return
    }

    const prosemirrorDocument = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Hello World!',
            },
          ],
        },
      ],
    }

    const schema = getSchema(defaultExtensions())
    return prosemirrorJSONToYDoc(schema, prosemirrorDocument, fieldName)
  },
})

server.listen()
