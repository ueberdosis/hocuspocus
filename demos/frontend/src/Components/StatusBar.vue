<template>
  <div class="bg-gray-100 rounded p-4 mb-8 flex content-center">
    <div class="flex-1">
      Status: {{ status }}
    </div>
    <div class="flex-1">
      Synced: {{ provider.synced }}
    </div>
    <div class="flex-1 text-right">
      <button v-if="status !== 'connected'" @click="provider.connect()" class="border-2 border-black bg-black text-white px-4 py-2 rounded">
        connect
      </button>
      <button v-if="status !== 'disconnected'" @click="provider.disconnect()" class="border-2 border-black bg-white px-4 py-2 rounded">
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
  },

  mounted() {
    this.provider.on('status', ({ status }) => {
      this.status = status
    })
  },
}
</script>
