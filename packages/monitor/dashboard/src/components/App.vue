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

    <div class="mt-8">
      <connections
        :connection-count="connectionCount"
        :document-count="documentCount"
        :message-count="messageCount"
      />
    </div>

    <div class="mt-8 z-10 relative">
      <log
        :connections="connections"
        :documents="documents"
      />
    </div>
  </div>
</template>

<script>
import Vue from 'vue'
import Cpu from './Cpu'
import Info from './Info'
import Memory from './Memory'
import Log from './Log'
import Connections from './Connections'

export default Vue.extend({
  components: {
    Log,
    Cpu,
    Info,
    Memory,
    Connections,
  },

  data() {
    return {
      connections: [],
      connectionCount: [],
      documentCount: [],
      messageCount: [],
      cpu: [],
      documents: [],
      info: {},
      memory: [],
      socket: null,
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
            key,
            timestamp,
            value,
          })
          return
        }

        this[key] = this[key].concat(value.map(value => ({
          key,
          timestamp,
          value,
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
