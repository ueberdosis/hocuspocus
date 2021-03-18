import { getSchema } from '@tiptap/core'
import { Document } from '@tiptap/extension-document'
import { Paragraph } from '@tiptap/extension-paragraph'
import { Text } from '@tiptap/extension-text'
import { prosemirrorJSONToYDoc } from 'y-prosemirror'

import { Doc } from 'yjs'
import { Logger } from '../../packages/logger/src'
import { Server, onCreateDocumentPayload } from '../../packages/server/src'

const server = Server.configure({
  port: 1234,
  throttle: false,

  async onCreateDocument(data: onCreateDocumentPayload) {
    const prosemirrorDocument = JSON.parse(`{
      "type": "doc",
      "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Hello World!" }] }]
    }`)

    const schema = getSchema([Document, Paragraph, Text])
    const ydoc = prosemirrorJSONToYDoc(schema, prosemirrorDocument, 'default')

    console.log('onCreateDocument:', ydoc.toJSON())

    return ydoc
  },

  extensions: [
    new Logger(),
  ],
})

server.listen()
