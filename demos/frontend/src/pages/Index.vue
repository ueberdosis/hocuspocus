<template>
  <div>
    <h1 class="text-3xl mb-8">
      Text editing
    </h1>

    <StatusBar
      v-if="provider"
      :provider="provider"
    />

    <h2>
      Editor
    </h2>
    <div v-if="editor">
      <editor-content
        :editor="editor"
        class="editor"
      />
    </div>

    <h2>
      Another editor
    </h2>
    <div v-if="anotherEditor">
      <editor-content
        :editor="anotherEditor"
        class="editor"
      />
    </div>

    <h2>Y.js document</h2>
    <div v-if="ydoc">
      {{ ydocJSON }}
    </div>
  </div>
</template>

<script>
import { Editor, EditorContent } from '@tiptap/vue-2'
// import StarterKit from '@tiptap/starter-kit'
import { Document } from '@tiptap/extension-document'
import { Paragraph } from '@tiptap/extension-paragraph'
import { Text } from '@tiptap/extension-text'
import Collaboration from '@tiptap/extension-collaboration'
import * as Y from 'yjs'
// import { WebsocketProvider } from 'y-websocket'
import { HocuspocusProvider } from '../../../../packages/provider/src'
// import { IndexeddbPersistence } from 'y-indexeddb'

export default {
  components: {
    EditorContent,
  },

  data() {
    return {
      provider: null,
      editor: null,
      anotherEditor: null,
      ydoc: null,
      indexdb: null,
    }
  },

  computed: {
    ydocJSON() {
      return {
        default: this.ydoc.getXmlFragment('default').toJSON(),
        secondary: this.ydoc.getXmlFragment('secondary').toJSON(),
      }
    },
  },

  mounted() {
    this.ydoc = new Y.Doc()
    // this.provider = new WebsocketProvider('ws://127.0.0.1:1234', 'hocuspocus-demo', this.ydoc, {
    //   params: {
    //     token: '123456',
    //   },
    // })

    this.provider = new HocuspocusProvider({
      url: 'ws://127.0.0.1:1234',
      name: 'hocuspocus-demo',
      document: this.ydoc,
      // maxAttempts: 1,
      // token: 'my-access-token',
      // onConnect: () => {
      //   console.log('connected')
      // },
      // onAuthenticated: () => {
      //   console.log('authenticated')
      // },
      // onAuthenticationFailed: () => {
      //   console.log('authentication failed')
      // },
      // onMessage: ({ event, message }) => {
      //   console.log(`[message] ◀️ ${message.name}`, event)
      // },
      // onOutgoingMessage: ({ message }) => {
      //   console.info(`[message] ▶️ ${message.name} (${message.description})`)
      // },
      // onClose: ({ event }) => {
      //   console.log(event.type, { event })
      // },
      // onDisconnect: ({ event }) => {
      //   console.log(event.type, event.code, event.reason, { event })
      // },
    })

    // this.indexdb = new IndexeddbPersistence('hocuspocus-demo', this.ydoc)

    this.editor = new Editor({
      extensions: [
        Document,
        Paragraph,
        Text,
        // StarterKit.configure({
        //   history: false,
        // }),
        Collaboration.configure({
          document: this.ydoc,
          field: 'default',
        }),
      ],
    })

    this.anotherEditor = new Editor({
      extensions: [
        Document,
        Paragraph,
        Text,
        // StarterKit.configure({
        //   history: false,
        // }),
        Collaboration.configure({
          document: this.ydoc,
          field: 'secondary',
        }),
      ],
    })
  },

  beforeDestroy() {
    this.editor.destroy()
    this.anotherEditor.destroy()
    this.provider.destroy()
  },
}
</script>

<style>
.ProseMirror {
  border: 1px solid grey;
  padding: 1rem;
}
</style>
