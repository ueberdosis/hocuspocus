<template>
  <div>
    <p>Status: {{ status }}, Synced: {{ provider.synced }}</p>

    <button v-if="status !== 'connected'" @click="provider.connect()">
      connect
    </button>
    <button v-if="status !== 'disconnected'" @click="provider.disconnect()">
      disconnect
    </button>
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
