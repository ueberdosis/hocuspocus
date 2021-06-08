<template>
  <Layout>
    <h1>
      Awareness
    </h1>

    <p>Status: {{ status }}, Synced: {{ provider ? provider.synced : null }}</p>

    <button v-if="status !== 'connected'" @click="provider.connect()">
      connect
    </button>
    <button v-if="status !== 'disconnected'" @click="provider.disconnect()">
      disconnect
    </button>

    <button @click="setAwarenessFields()">
      setAwarenessFields
    </button>

    <h2>Users</h2>

    <ul v-for="state in states">
      <li :style="`color: ${state.user.color}`">{{ state.user.name }}</li>
    </ul>

    {{ states }}
  </Layout>
</template>

<script>
import * as Y from 'yjs'
// import { WebsocketProvider } from 'y-websocket'
import { HocuspocusProvider } from '../../../../packages/provider/src'

export default {
  data() {
    return {
      ydoc: null,
      provider: null,
      status: 'connecting',
      states: [],
    }
  },

  mounted() {
    this.ydoc = new Y.Doc()
    // this.provider = new WebsocketProvider('ws://127.0.0.1:1234', 'hocuspocus-demo', this.ydoc, {
    //   params: {
    //     token: '123456',
    //   },
    // })

    this.provider = new HocuspocusProvider({
      url: 'ws://127.0.0.1:1234',
      name: 'hocuspocus-demo',
      document: this.ydoc,
      parameters: {
        token: '123456',
      },
      onConnect: () => {
        console.log('connected')
      },
      onMessage: event => {
        console.log(event.type, { event })
      },
      onClose: event => {
        console.log(event.type, { event })
      },
      onDisconnect: event => {
        console.log(event.type, event.code, event.reason, { event })
      },
    })

    this.provider.on('status', event => {
      this.status = event.status
    })

    this.provider.awareness.on('change', changes => {
      this.states = Array.from(this.provider.awareness.getStates().values())
    })

    this.setAwarenessFields()
  },

  methods: {
    setAwarenessFields() {
      this.provider.awareness.setLocalStateField('user', {
        name: 'Emmanuelle Charpentier',
        color: '#ffb61e',
      })
    },
  },

  beforeUnmount() {
    this.provider.destroy()
  },
}
</script>
