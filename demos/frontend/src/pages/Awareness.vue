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
        #{{ state.clientId }} {{ state.user.name }} ({{ state.user.clientX }}, {{ state.user.clientY }})
      </li>
    </ul>

    <div
      v-for="state in filteredStates"
      :key="state.clientId"
      :style="`
        position: absolute;
        background-color: ${state.user.color};
        top: ${state.user.clientY}px;
        left: ${state.user.clientX}px;
        width: 12px;
        height: 12px;
        margin-left: -6px;
        margin-top: -6px;
        pointer-events: none;
        border-radius: 50%;
      `"
    />

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
import { awarenessStatesToArray } from '../utils/awarenessStatesToArray'

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
        clientX: 0,
        clientY: 0,
        visible: false,
      },
    }
  },

  computed: {
    filteredStates() {
      return this
        .states
        .filter(state => state.user.visible)
        .filter(state => state.clientId !== this.ydoc.clientID)
    },
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
      // onMessage: ({event}) => {
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
      document.addEventListener('mousemove', event => {
        console.log({ event })
        this.me.clientX = event.clientX
        this.me.clientY = event.clientY
        this.me.visible = true

        this.setAwarenessState()
      })

      document.addEventListener('mouseout', event => {
        this.me.visible = false

        this.setAwarenessState()
      })
    },
    removeEventListeners() {
      document.removeEventListeners('mousemove')
      document.removeEventListeners('mouseout')
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
