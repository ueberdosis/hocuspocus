<template>
  <div>
    <h1 class="text-3xl mb-8">
      Collaborative Editing with TiptapCollab
    </h1>

    <p class="border p-2">Make sure that your backend is running the tiptapcollab server: npm run dev src/tiptapcollab.ts</p>

    <div class="my-5">
      <label
        for="appId"
        class="mr-2"
      >App ID</label>

      <input
        id="appId"
        v-model="appId"
        class="border border-black p-2 my-2"
      >

      <label
        for="secret"
        class="mx-2"
      >Secret</label>

      <input
        id="secret"
        v-model="secret"
        class="border border-black p-2 my-2 w-1/2"
      >
    </div>

    <div class="my-5">
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

<script setup lang="ts">
import { Editor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Collaboration from '@tiptap/extension-collaboration'
import { TiptapCollabProvider } from '@tiptap-cloud/provider'
import axios from 'axios'
import {
  nextTick, onMounted, ref, shallowRef, watch,
} from 'vue'
import StatusBar from '../components/StatusBar.vue'

const appId = ref('')
const secret = ref('')
const jwt = ref('')
const provider = shallowRef<TiptapCollabProvider>()
const provider2 = shallowRef<TiptapCollabProvider>()
const editor = shallowRef<Editor>()
const editor2 = shallowRef<Editor>()

watch([jwt, appId, secret], () => {
  if (editor.value) editor.value.destroy()
  if (editor2.value) editor2.value.destroy()
  if (provider.value) provider.value.destroy()
  if (provider2.value) provider2.value.destroy()

  provider.value = new TiptapCollabProvider({
    appId: appId.value,
    name: 'test1',
    token: jwt.value,
  })

  provider2.value = new TiptapCollabProvider({
    appId: appId.value,
    name: 'test2',
    token: jwt.value,
  })

  nextTick(() => {
    editor.value = new Editor({
      extensions: [
        StarterKit.configure({
          history: false,
        }),
        Collaboration.configure({
          document: provider.value?.document,
          field: 'default',
        }),
      ],
    })

    editor2.value = new Editor({
      extensions: [
        StarterKit.configure({
          history: false,
        }),
        Collaboration.configure({
          document: provider2.value?.document,
          field: 'default',
        }),
      ],
    })
  })
})

onMounted(() => {
  // do NOT transfer the secret like this in production, this is just for demoing purposes. The secret should be stored on and never leave the server.
  axios.get(`http://127.0.0.1:1234?secret=${secret.value}`).then(data => {
    jwt.value = data.data
  })
})

</script>

<style>
.ProseMirror {
  border: 1px solid grey;
  padding: 1rem;
}
</style>
