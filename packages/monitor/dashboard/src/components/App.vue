<template>
  <div class="container mx-auto px-4 pt-12">
    <h1 class="text-2xl font-bold">@hocuspocus/monitor 📈</h1>

    <div class="flex mt-8 mr-1">
      <div class="flex-1 mr-2">
        <memory :data="memory" />
      </div>

      <div class="flex-1 mx-2">
        <cpu :data="cpu" />
      </div>

      <div class="flex-1 ml-2">
        <info :info="info" />
      </div>
    </div>
  </div>
</template>

<script>
import Vue from 'vue'
import Cpu from './Cpu'
import Info from './Info'
import Memory from './Memory'

export default Vue.extend({
  components: {
    Cpu,
    Info,
    Memory,
  },

  data() {
    return {
      socket: null,
      cpu: [],
      memory: [],
      info: {},
    }
  },

  methods: {
    handleMessage(event) {
      const { data } = JSON.parse(event.data)

      data.forEach(({ timestamp, key, value }) => {
        if (!this[key]) {
          return
        }

        if (!Array.isArray(this[key])) {
          this[key] = value
          return
        }

        if (!Array.isArray(value)) {
          this[key].push({
            value,
            timestamp,
          })
          return
        }

        this[key] = this[key].concat(value.map(value => ({
          value,
          timestamp,
        })))
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
