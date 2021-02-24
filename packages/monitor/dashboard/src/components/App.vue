<template>
  <div class="container mx-auto px-4 pt-12">
    <h1 class="text-2xl font-bold">@hocuspocus/monitor 📈</h1>

    <div class="flex mt-8">
      <div class="flex-auto">
        <memory :data="data" />
      </div>
    </div>
  </div>
</template>

<script>
import Vue from 'vue'
import collect from 'collect.js'
import Memory from './Memory'

export default Vue.extend({
  components: {
    Memory,
  },

  data() {
    return {
      socket: null,
      data: [],
    }
  },

  methods: {
    handleMessage(event) {
      const { data } = JSON.parse(event.data)

      const oldData = collect(this.data).search(item => item.key === data.key)

      if (oldData === false) {
        return this.data.push(data)
      }

      this.data[oldData] = {
        key: data.key,
        value: {
          ...this.data[oldData].value,
          ...data.value,
        },
      }
    },
  },

  mounted() {
    this.socket = new WebSocket(
      window.location.href
        .replace('http:', 'ws:')
        .replace('https:', 'wss:'),
    )

    this.socket.onmessage = this.handleMessage.bind(this)
  },
})
</script>
