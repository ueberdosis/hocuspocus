<template>
  <div>
    <p>Status: {{ status }}, Synced: {{ provider ? provider.synced : null }}, Ydoc: {{ ydoc ? ydoc.toJSON() : null }}</p>
    <div v-if="editor">
      <editor-content :editor="editor" />
    </div>

    <div v-if="editor2">
      <editor-content :editor="editor2" />
    </div>
  </div>
</template>

<script>
import { Editor, EditorContent } from '@tiptap/vue-2'
import StarterKit from '@tiptap/starter-kit'
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
      synced: false,
      ydoc: null,
    }
  },

  mounted() {
    this.ydoc = new Y.Doc()
    this.provider = new WebsocketProvider('ws://127.0.0.1:1234', 'hocuspocus-demo', this.ydoc, {
      params: {
        token: '123456',
      },
    })

    this.provider.on('status', event => {
      this.status = event.status
    })

    window.ydoc = this.ydoc

    this.editor = new Editor({
      extensions: [
        StarterKit.configure({
          history: false,
        }),
        Collaboration.configure({
          document: this.ydoc,
          field: 'default',
        }),
      ],
    })

    this.editor2 = new Editor({
      extensions: [
        StarterKit.configure({
          history: false,
        }),
        Collaboration.configure({
          document: this.ydoc,
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
