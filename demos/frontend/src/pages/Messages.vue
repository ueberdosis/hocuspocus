<template>
  <Layout>
    <h1>
      Messages
    </h1>

    <p>Status: {{ status }}, Synced: {{ provider ? provider.synced : null }}</p>

    <button @click="provider.connect()">
      connect
    </button>
    <button @click="provider.disconnect()">
      disconnect
    </button>

    <p>
      Open console
    </p>
  </Layout>
</template>

<script>
import * as Y from 'yjs'
import { HocuspocusProvider } from '../../../../packages/provider/src'

export default {
  data() {
    return {
      ydoc: null,
      provider: null,
      status: 'connecting',
    }
  },

  mounted() {
    this.ydoc = new Y.Doc()

    this.provider = new HocuspocusProvider({
      url: 'ws://127.0.0.1:1234',
      name: 'hocuspocus-demo',
      document: this.ydoc,
      debug: true,
      onOpen: () => {
        console.log('[open]')
      },
      onConnect: () => {
        console.log('[connect]')
      },
      onMessage: ({ event, message }) => {
        console.log('[message]', message.type, event)
      },
      onClose: event => {
        console.log('[close]', event.type, event.code, event.reason, event)
      },
      onDisconnect: event => {
        console.log('[disconnect]', event.type, event.code, event.reason, event)
      },
      onDestroy: () => {
        console.log('[destroy]')
      },
    })

    this.provider.on('status', event => {
      this.status = event.status
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
