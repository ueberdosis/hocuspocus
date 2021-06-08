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

    <h2>
      Users
    </h2>

    <ul>
      <li v-for="state in states" :key="state.clientId">
        <span :style="`background-color: ${state.user.color}; width: 1rem; height: 1rem; margin-right: 0.5rem; display: inline-block;`" />
        #{{ state.clientId }} {{ state.user.name }} ({{ state.user.x }}, {{ state.user.y }})
      </li>
    </ul>

    <h2>
      Tasks
    </h2>
    <ul>
      <li>Disconnect → Connect → States aren’t synced</li>
      <li>Integrate well with @hocuspocus/provider</li>
    </ul>
  </Layout>
</template>

<script>
import * as Y from 'yjs'
// import { WebsocketProvider } from 'y-websocket'
import { HocuspocusProvider } from '../../../../packages/provider/src'

const awarenessStatesToArray = states => {
  return Array.from(states.entries()).map(([key, value]) => {
    return {
      clientId: key,
      ...value,
    }
  })
}

export default {
  data() {
    return {
      ydoc: null,
      provider: null,
      status: 'connecting',
      states: [],
      me: {
        name: 'Emmanuelle Charpentier',
        color: '#ffb61e',
        x: 0,
        y: 0,
      },
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
      debug: true,
      onConnect: () => {
        console.log('connected')

        this.setAwarenessState()
      },
      // onMessage: event => {
      //   console.log(event.type, { event })
      // },
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

    this.provider.awareness.on('change', () => {
      this.states = awarenessStatesToArray(this.provider.awareness.getStates())
    })

    this.bindEventListeners()
  },

  methods: {
    bindEventListeners() {
      document.addEventListener('mousemove', e => {
        this.me.x = e.offsetX
        this.me.y = e.offsetY

        this.setAwarenessState()
      })
    },
    removeEventListeners() {
      document.removeEventListeners('mousemove')
    },
    setAwarenessState() {
      this.provider.awareness.setLocalStateField('user', this.me)
    },
  },

  beforeDestroy() {
    this.provider.destroy()
  },
}
</script>
