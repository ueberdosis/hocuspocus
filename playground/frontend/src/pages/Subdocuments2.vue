<template>
  <div>
    <h1 class="text-3xl mb-8">
      Subdocuments2: Blog post with title and content
    </h1>

    <StatusBar
      v-if="provider"
      :provider="provider"
    />

    <h2>Title</h2>

    <editor-content
      :editor="titleEditor"
      class="editor"
    />

    <h2>Content</h2>

    <editor-content
      :editor="contentEditor"
      class="editor"
    />

    <h3>Todos</h3>

    <button @click="addTodo">Add Todo</button>

    <ul v-if="todos.length > 0">
      <li v-for="todo in todos.createTreeWalker()">
        {{ todo }}
      </li>
    </ul>
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
      titleEditor: null,
      contentEditor: null,
      ydoc: null,
      todos: [],
    }
  },

  methods: {
    addTodo() {
      this.todos.push([new Y.XmlText('test2')])
      console.log('pushed')
    },
  },

  mounted() {
    this.ydoc = new Y.Doc()

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this

    this.provider = new HocuspocusProvider({
      url: 'ws://127.0.0.1:1234',
      name: 'hocuspocus-demo',
      document: this.ydoc,
      onSynced() {
        self.todos = self.ydoc.getXmlFragment('todos')
      },
    })
    this.titleEditor = new Editor({
      extensions: [
        Document,
        Paragraph,
        Text,
        Collaboration.configure({
          document: this.ydoc,
          field: 'title',
        }),
      ],
    })

    this.contentEditor = new Editor({
      extensions: [
        Document,
        Paragraph,
        Text,
        Collaboration.configure({
          document: this.ydoc,
          field: 'content',
        }),
      ],
    })
  },
}
</script>

<style>
.ProseMirror {
  border: 1px solid grey;
  padding: 1rem;
}
</style>
