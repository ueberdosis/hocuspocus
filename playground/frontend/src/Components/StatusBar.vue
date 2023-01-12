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

<script>
export default {
  data() {
    return {
      status: 'connecting',
    }
  },

  props: {
    provider: {
      default: null,
      type: Object,
    },
    socket: {
      default: null,
      type: Object,
    },
  },

  mounted() {
    this.socket.on('status', ({ status }) => {
      this.status = status
    })
  },
}
</script>
