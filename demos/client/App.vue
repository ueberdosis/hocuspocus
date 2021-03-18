<template>
  <div>
    <p>Status: {{ status }}</p>
    <div v-if="editor">
      <editor-content :editor="editor" />
    </div>
  </div>
</template>

<script>
import { Editor, EditorContent } from '@tiptap/vue-2'
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

    this.editor = new Editor({
      extensions: [
        ...defaultExtensions().filter(extension => extension.config.name !== 'history'),
        Collaboration.configure({
          document: ydoc,
        }),
      ],
    })
  },

  beforeDestroy() {
    this.editor.destroy()
    this.provider.destroy()
  },
}
</script>
