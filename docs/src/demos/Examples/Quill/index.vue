<template>
  <div ref="editor"></div>
</template>

<script>
import Quill from 'quill'
import { QuillBinding } from 'y-quill'

import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'

import 'quill/dist/quill.core.css'
import 'quill/dist/quill.bubble.css'

import QuillCursors from 'quill-cursors'
Quill.register('modules/cursors', QuillCursors)

export default {
  data() {
    return {
      editor: null
    }
  },

  mounted() {
    const ydoc = new Y.Doc()
    const type = ydoc.getText('quill')
    const provider = new WebsocketProvider('wss://websocket.tiptap.dev', 'hocuspocus-example-quill', ydoc)

    this.editor = new Quill(this.$refs.editor, {
      modules: {
        cursors: true,
        toolbar: [
          [
            { header: [1, 2, 3, 4, false] }
          ],
          [
            'bold', 'italic', 'underline',
          ]
        ],
        history: {
          userOnly: true
        },
      },
      theme: 'bubble',
      formats: [
        'bold', 'underline', 'header', 'italic'
      ],
    })

    const binding = new QuillBinding(type, this.editor, provider.awareness)
  }
}
</script>
