<template>
  <div class="bg-gray-100 rounded p-4 mb-8 flex content-center">
    <div class="flex-1 flex flex-col justify-center">
      {{ status }} to {{ provider.configuration.name }} at {{ socket.configuration.url }}
    </div>
    <div class="flex-1 flex flex-col justify-center text-center">
      <template v-if="provider.synced">
        synced
      </template>
      <span v-else>
        not synced
      </span>
    </div>
    <div class="flex-1 text-right">
      <button
        v-if="status === 'disconnected'"
        @click="socket.connect()"
        class="ml-3 border-2 border-black bg-black text-white px-4 py-2 rounded"
      >
        connect
      </button>
      <button
        v-else
        @click="socket.disconnect()"
        class="ml-3 border-2 border-black bg-white px-4 py-2 rounded"
      >
        disconnect
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, defineProps, onMounted } from 'vue'
import { HocuspocusProvider, HocuspocusProviderWebsocket } from '@hocuspocus/provider'

const status = ref('')
const props = defineProps<{
  provider: HocuspocusProvider,
  socket: HocuspocusProviderWebsocket
}>()

onMounted(() => {
  props.socket.on('status', event => {
    status.value = event.status
  })
})
</script>
