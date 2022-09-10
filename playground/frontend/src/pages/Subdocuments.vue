<template>
  <div>
    <h1 class="text-3xl mb-8">
      Subdocuments
    </h1>

    <StatusBar
      v-if="provider"
      :provider="provider"
    />

    {{ folder }}

    <h2>Todos</h2>

    {{ todos }}
    <h2>
      Editor
    </h2>
    <div v-if="editor">
      <editor-content
        :editor="editor"
        class="editor"
      />
    </div>
  </div>
</template>

<script>
import { Editor, EditorContent } from '@tiptap/vue-2'
import { Document } from '@tiptap/extension-document'
import { Paragraph } from '@tiptap/extension-paragraph'
import { Text } from '@tiptap/extension-text'
import Collaboration from '@tiptap/extension-collaboration'
import * as Y from 'yjs'
import { HocuspocusProvider } from '@hocuspocus/provider'

export default {
  components: {
    EditorContent,
  },

  data() {
    return {
      provider: null,
      editor: null,
      ydoc: null,
      folder: new Map(),
      todos: null,
    }
  },

  mounted() {

    // Notes
    this.ydoc = new Y.Doc()
    this.folder = this.ydoc.getMap()
    // this.todos = new Y.Doc({ autoLoad: true })

    // if (undefined === this.folder.get('todos')) {
    // this.folder.set('todos', todosSubdoc)
    // }

    const self = this

    this.provider = new HocuspocusProvider({
      url: 'ws://127.0.0.1:1234',
      name: 'hocuspocus-demo',
      document: this.ydoc,
      onMessage(data) {
        console.log('onMessage', data.message)
      },
      onSynced() {
        // if (self.folder.get('toddos') === null) {
        //   console.log('creating new ydoc')
        //   self.folder.set('todos', new Y.Doc())
        // }

        self.todos = self.folder.get('todos')
        self.todos.getArray('randomNumberList').push([Math.floor(Math.random() * 1000)])
        self.todos.load()
        self.todos.on('synced', () => {
          console.log('synced', self.todos)
          self.todos.getArray('randomNumberList').push([Math.floor(Math.random() * 1000)])
        })
      },
    })

    this.editor = new Editor({
      extensions: [
        Document,
        Paragraph,
        Text,
        Collaboration.configure({
          document: this.ydoc,
          field: 'default',
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

<style>
.ProseMirror {
  border: 1px solid grey;
  padding: 1rem;
}
</style>
