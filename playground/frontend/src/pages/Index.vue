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

    <button @click="provider.setAwarenessField('date', Date.now())">provider.setAwarenessField('date', Date.now())</button>

    <StatusBar
      v-if="anotherProvider"
      :provider="anotherProvider"
    />

    <h2>
      Another Editor
    </h2>
    <div v-if="anotherEditor">
      <editor-content
        :editor="anotherEditor"
        class="editor"
      />
    </div>

    <button @click="anotherProvider.setAwarenessField('date', Date.now())">anotherProvider.setAwarenessField('date', Date.now())</button>
  </div>
</template>

<script>
import { Editor, EditorContent } from '@tiptap/vue-2'
import StarterKit from '@tiptap/starter-kit'
import Collaboration from '@tiptap/extension-collaboration'
import { HocuspocusProvider, HocuspocusCloudProvider } from '@hocuspocus/provider'

export default {
  components: {
    EditorContent,
  },

  data() {
    return {
      provider: null,
      anotherProvider: null,
      editor: null,
      anotherEditor: null,
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
      broadcast: false,
      onAwarenessChange: ({ states }) => {
        console.log('provider', states)
      },
    })

    this.anotherProvider = new HocuspocusProvider({
      url: 'ws://127.0.0.1:1234',
      name: 'hocuspocus-demo',
      broadcast: false,
      onAwarenessChange: ({ states }) => {
        console.log('anotherProvider', states)
      },
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

    this.anotherEditor = new Editor({
      extensions: [
        StarterKit.configure({
          history: false,
        }),
        Collaboration.configure({
          document: this.anotherProvider.document,
          field: 'default',
        }),
      ],
    })
  },

  beforeDestroy() {
    this.editor.destroy()
    this.anotherEditor.destroy()
    this.provider.destroy()
    this.anotherProvider.destroy()
  },
}
</script>

<style>
.ProseMirror {
  border: 1px solid grey;
  padding: 1rem;
}
</style>
