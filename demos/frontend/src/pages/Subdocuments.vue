<template>
  <div>
    <h1 class="text-3xl mb-8">
      Subdocuments
    </h1>

    <StatusBar v-if="provider" :provider="provider" />

    {{ notes }}
    <!-- <h2>
      Editor
    </h2>
    <div v-if="editor">
      <editor-content :editor="editor" class="editor" />
    </div> -->
  </div>
</template>

<script>
// import { Editor, EditorContent } from '@tiptap/vue-2'
// import { Document } from '@tiptap/extension-document'
// import { Paragraph } from '@tiptap/extension-paragraph'
// import { Text } from '@tiptap/extension-text'
// import Collaboration from '@tiptap/extension-collaboration'
import * as Y from 'yjs'
import { HocuspocusProvider } from '../../../../packages/provider/src'

export default {
  components: {
    // EditorContent,
  },

  data() {
    return {
      provider: null,
      editor: null,
      ydoc: null,
      notes: new Map(),
    }
  },

  mounted() {

    // Notes
    this.ydoc = new Y.Doc()
    this.notes = this.ydoc.getMap()

    // Current note
    const note = new Y.Doc()
    note.getText().insert(0, 'some initial content')

    // Attach
    const randomNumber = Math.floor(Math.random() * 1000)
    this.notes.set(`note-${randomNumber}`, note)

    this.provider = new HocuspocusProvider({
      url: 'ws://127.0.0.1:1234',
      name: 'hocuspocus-demo',
      document: this.ydoc,
    })

    // this.editor = new Editor({
    //   extensions: [
    //     Document,
    //     Paragraph,
    //     Text,
    //     Collaboration.configure({
    //       document: this.ydoc,
    //       field: 'default',
    //     }),
    //   ],
    // })
  },

  beforeUnmount() {
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
