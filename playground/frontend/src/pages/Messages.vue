<template>
  <div>
    <h1 class="text-3xl mb-8">
      Messages
    </h1>

    <StatusBar
      v-if="provider"
      :provider="provider"
      :socket="provider.configuration.websocketProvider"
    />

    <p>
      Open console
    </p>
  </div>
</template>

<script>
import * as Y from 'yjs'
import { HocuspocusProvider } from '@hocuspocus/provider'
import StatusBar from '../components/StatusBar.vue'

export default {
  components: {
    StatusBar,
  },
  data() {
    return {
      ydoc: null,
      provider: null,
    }
  },

  mounted() {
    this.ydoc = new Y.Doc()

    this.provider = new HocuspocusProvider({
      url: 'ws://127.0.0.1:1234',
      name: 'hocuspocus-demo',
      document: this.ydoc,
      debug: true,
      onOpen() {
        console.log('[open]')
      },
      onConnect() {
        console.log('[connected]')
      },
      onStatus: ({ status }) => {
        console.log('[status]', status)
      },
      onMessage: ({ event, message }) => {
        console.log(`[message] ◀️ ${message.name}`, event)
      },
      onOutgoingMessage: ({ message }) => {
        console.info(`[message] ▶️ ${message.name} (${message.description})`)
      },
      onClose: ({ event }) => {
        console.log('[close]', event.code, event.reason, event)
      },
      onDisconnect: ({ event }) => {
        console.log('[disconnect]', event.code, event.reason, event)
      },
      onDestroy() {
        console.log('[destroy]')
      },
    })

    // this.provider.awareness.on('change', () => {
    //   this.states = awarenessStatesToArray(this.provider.awareness.getStates())
    // })
  },

  beforeDestroy() {
    this.provider.destroy()
  },
}
</script>
