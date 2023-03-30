<template>
  <div>
    <h1 class="text-3xl mb-8">
      Collaborative Editing with TiptapCollab
    </h1>

    <p>
      If this demo doesnt work:
    </p>

    <ul>
      <li>Make sure that your backend is running the tiptapcollab server: npm run dev src/tiptapcollab.ts</li>
      <li>Make sure the appIds below and the secret in tiptapcollab.ts are from your tiptapcollab instance</li>
    </ul><br>

    <StatusBar
      v-if="provider"
      :provider="provider"
      :socket="provider.configuration.websocketProvider"
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

    <StatusBar
      v-if="provider2"
      :provider="provider2"
      :socket="provider2.configuration.websocketProvider"
    />

    <h2>
      Editor
    </h2>
    <div v-if="editor2">
      <editor-content
        :editor="editor2"
        class="editor"
      />
    </div>
  </div>
</template>

<script>
import { Editor, EditorContent } from '@tiptap/vue-2'
import StarterKit from '@tiptap/starter-kit'
import Collaboration from '@tiptap/extension-collaboration'
import { TiptapCollabProvider } from '@hocuspocus/provider'
import axios from 'axios'

export default {
  components: {
    EditorContent,
  },

  data() {
    return {
      provider: null,
      editor: null,
      provider2: null,
      editor2: null,
      jwt: null,
    }
  },

  watch: {
    jwt() {
      if (!this.jwt) return

      this.provider = new TiptapCollabProvider({
        appId: 'XY9DJ9E6',
        name: 'test1',
        token: this.jwt,
      })

      this.provider2 = new TiptapCollabProvider({
        appId: 'XY9DJ9E6',
        name: 'test2',
        token: this.jwt,
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

      this.editor2 = new Editor({
        extensions: [
          StarterKit.configure({
            history: false,
          }),
          Collaboration.configure({
            document: this.provider2.document,
            field: 'default',
          }),
        ],
      })

    },
  },

  mounted() {
    axios.get('http://127.0.0.1:1234').then(data => {
      this.jwt = data.data
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
