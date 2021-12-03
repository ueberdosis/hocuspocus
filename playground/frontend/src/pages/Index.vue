<template>
  <div>
    <h1 class="text-3xl mb-8">
      Text Editing with Tiptap
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
  </div>
</template>

<script>
import { Editor, EditorContent } from '@tiptap/vue-2'
import StarterKit from '@tiptap/starter-kit'
import Collaboration from '@tiptap/extension-collaboration'
import { HocuspocusProvider, HocuspocusCloudProvider } from '../../../../packages/provider/src'

export default {
  components: {
    EditorContent,
  },

  data() {
    return {
      provider: null,
      editor: null,
    }
  },

  mounted() {
    // this.provider = new HocuspocusCloudProvider({
    //   key: '',
    //   name: 'hocuspocus-demo',
    // })

    this.provider = new HocuspocusProvider({
      url: 'ws://127.0.0.1:1234',
      name: 'hocuspocus-demo',
    })

    this.editor = new Editor({
      extensions: [
        StarterKit.configure({
          history: false,
        }),
        Collaboration.configure({
          document: this.provider.document,
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
