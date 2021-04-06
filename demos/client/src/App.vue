<template>
  <div>
    <p>Status: {{ status }}</p>
    <div v-if="editor">
      <editor-content :editor="editor" />
    </div>

    <div v-if="editor2">
      <editor-content :editor="editor2" />
    </div>
  </div>
</template>

<script>
import { Editor, EditorContent } from '@tiptap/vue-3'
import { defaultExtensions } from '@tiptap/starter-kit'
import Collaboration from '@tiptap/extension-collaboration'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'

export default {
  components: {
    EditorContent,
  },

  data() {
    return {
      provider: null,
      editor: null,
      editor2: null,
      status: 'connecting',
    }
  },

  mounted() {
    const ydoc = new Y.Doc()
    this.provider = new WebsocketProvider('ws://127.0.0.1:1234', 'tiptap-collaboration-example', ydoc)

    this.provider.on('status', event => {
      this.status = event.status
    })

    window.ydoc = ydoc

    const extensions = defaultExtensions().filter(extension => extension.config.name !== 'history')

    this.editor = new Editor({
      extensions: [
        ...extensions,
        Collaboration.configure({
          document: ydoc,
          field: 'default',
        }),
      ],
    })

    this.editor2 = new Editor({
      extensions: [
        ...extensions,
        Collaboration.configure({
          document: ydoc,
          field: 'secondary',
        }),
      ],
    })
  },

  beforeUnmount() {
    this.editor.destroy()
    this.editor2.destroy()
    this.provider.destroy()
  },
}
</script>
