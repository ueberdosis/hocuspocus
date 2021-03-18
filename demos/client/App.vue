<template>
  <editor-content :editor="editor" />
</template>

<script>
import * as Y from 'yjs'
import Collaboration from '@tiptap/extension-collaboration'
import { Document } from '@tiptap/extension-document'
import { Editor, EditorContent } from '@tiptap/vue-2'
import { Paragraph } from '@tiptap/extension-paragraph'
import { Text } from '@tiptap/extension-text'
import { WebsocketProvider } from 'y-websocket'

export default {
  components: {
    EditorContent,
  },

  data() {
    return {
      editor: null,
    }
  },

  mounted() {
    // A new Y document
    const ydoc = new Y.Doc()

    // Registered with a WebRTC provider
    const provider = new WebsocketProvider('ws://127.0.0.1:80', 'example-document', ydoc)

    this.editor = new Editor({
      extensions: [
        Document,
        Paragraph,
        Text,
        Collaboration.configure({
          document: ydoc,
        }),
      ],
    })
  },

  beforeDestroy() {
    this.editor.destroy()
  },
}
</script>
