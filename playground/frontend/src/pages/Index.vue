<template>
  <div>
    <h1 class="text-3xl mb-8">
      Text Editing with Tiptap
    </h1>

    <StatusBar
      v-if="provider"
      :provider="provider"
      :socket="socket"
    />

    <h2 class="mb-2">
      Editor
    </h2>
    <div v-if="editor">
      <editor-content
        :editor="editor"
        class="editor"
      />
    </div>

    <button
      class="special-button"
      @click="provider.setAwarenessField('date', Date.now())"
    >
      Update Date
    </button>

    <pre><code>{{ $states1 }}</code></pre>

    <StatusBar
      v-if="anotherProvider"
      :provider="anotherProvider"
      :socket="socket"
    />

    <h2 class="mb-2">
      Another Editor
    </h2>
    <div v-if="anotherEditor">
      <editor-content
        :editor="anotherEditor"
        class="editor"
      />
    </div>

    <button
      class="special-button"
      @click="anotherProvider.setAwarenessField('date', Date.now())"
    >
      Update Date
    </button>

    <pre><code>{{ $states2 }}</code></pre>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Editor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Collaboration from '@tiptap/extension-collaboration'
import {
  HocuspocusProvider, HocuspocusProviderWebsocket,
} from '@hocuspocus/provider'
import StatusBar from '../components/StatusBar.vue'

const socket = new HocuspocusProviderWebsocket({
  url: 'ws://127.0.0.1:1234',
})

const $states1 = ref({})
const $states2 = ref({})

const provider = new HocuspocusProvider({
  websocketProvider: socket,
  name: 'hocuspocus-demo',
  onAwarenessUpdate: ({ states }) => {
    $states1.value = states
  },
})

const anotherProvider = new HocuspocusProvider({
  websocketProvider: socket,
  name: 'hocuspocus-demo2',
  onAwarenessUpdate: ({ states }) => {
    $states2.value = states
  },
})

const editor = new Editor({
  extensions: [
    StarterKit.configure({
      history: false,
    }),
    Collaboration.configure({
      document: provider.document,
      field: 'default',
    }),
  ],
})

const anotherEditor = new Editor({
  extensions: [
    StarterKit.configure({
      history: false,
    }),
    Collaboration.configure({
      document: anotherProvider.document,
      field: 'default',
    }),
  ],
})

</script>

<style>
.ProseMirror {
  border: 1px solid grey;
  padding: 1rem;
}
</style>
