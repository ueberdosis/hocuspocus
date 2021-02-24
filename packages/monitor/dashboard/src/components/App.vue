<template>
  <div class="container mx-auto px-4 pt-12">
    <h1 class="text-2xl font-bold">@hocuspocus/monitor 📈</h1>

    <div class="flex mt-8 mr-1">
      <div class="flex-1 mr-2">
        <memory :data="data" />
      </div>
      <div class="flex-1 mx-2">
        <cpu :data="data" />
      </div>
      <div class="flex-1 ml-2">
        <info :info="info" />
      </div>
    </div>
  </div>
</template>

<script>
import Vue from 'vue'
import collect from 'collect.js'
import Memory from './Memory'
import Cpu from './Cpu'
import Info from './Info'

export default Vue.extend({
  components: {
    Cpu,
    Info,
    Memory,
  },

  data() {
    return {
      socket: null,
      data: [],
      info: {},
    }
  },

  methods: {
    handleMessage(event) {
      const { metrics, info } = JSON.parse(event.data)

      this.info = info || this.info

      metrics?.forEach(data => {
        const oldData = collect(this.data)
          .search(item => item.key === data.key)

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
      })
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
