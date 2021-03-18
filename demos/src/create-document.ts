import { getSchema } from '@tiptap/core'
import { Document } from '@tiptap/extension-document'
import { Paragraph } from '@tiptap/extension-paragraph'
import { Text } from '@tiptap/extension-text'
import { prosemirrorJSONToYDoc } from 'y-prosemirror'

import { Logger } from '../../packages/logger/src'
import { Server, onCreateDocumentPayload } from '../../packages/server/src'

const server = Server.configure({
  port: 1234,

  async onCreateDocument(data: onCreateDocumentPayload) {
    const prosemirrorDocument = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Example Text',
            },
          ],
        },
      ],
    }

    const schema = getSchema([Document, Paragraph, Text])
    const ydoc = prosemirrorJSONToYDoc(schema, prosemirrorDocument, 'default')

    console.log('onCreateDocument', ydoc.toJSON())

    return ydoc
  },

  extensions: [
    new Logger(),
  ],
})

server.listen()
