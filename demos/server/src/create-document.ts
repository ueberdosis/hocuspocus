import { getSchema } from '@tiptap/core'
import { defaultExtensions } from '@tiptap/starter-kit'
import { prosemirrorJSONToYDoc } from 'y-prosemirror'

import { Logger } from '../../../packages/logger/src'
import { Server, onCreateDocumentPayload } from '../../../packages/server/src'

const server = Server.configure({
  port: 1234,
  throttle: false,

  extensions: [
    new Logger(),
  ],

  async onCreateDocument(data: onCreateDocumentPayload) {
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
    const ydoc = prosemirrorJSONToYDoc(schema, prosemirrorDocument, 'default')

    return ydoc
  },
})

server.listen()
