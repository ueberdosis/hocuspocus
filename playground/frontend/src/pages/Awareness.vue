<template>
  <div>
    <h1 class="text-3xl mb-8">
      Awareness
    </h1>

    <StatusBar v-if="provider" :provider="provider" />

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
    </ul>
  </div>
</template>

<script>
import * as Y from 'yjs'
import { HocuspocusProvider } from '../../../../packages/provider/src'

export default {
  data() {
    return {
      ydoc: null,
      provider: null,
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
        .filter(state => state.user && state.user.visible)
        .filter(state => state.clientId !== this.ydoc.clientID)
    },
  },

  mounted() {
    this.ydoc = new Y.Doc()

    this.provider = new HocuspocusProvider({
      url: 'ws://127.0.0.1:1234',
      name: 'hocuspocus-demo',
      document: this.ydoc,
      onAwarenessUpdate: ({ states }) => {
        this.states = states
      },
    })

    this.setAwarenessState()
    this.bindEventListeners()
  },

  methods: {
    setAwarenessState(values = {}) {
      this.me = {
        ...this.me,
        ...values,
      }

      this.provider.setAwarenessField('user', this.me)
    },
    bindEventListeners() {
      document.addEventListener('mousemove', event => {
        this.setAwarenessState({
          clientX: event.clientX,
          clientY: event.clientY,
          visible: true,
        })
      })

      document.addEventListener('mouseout', event => {
        this.setAwarenessState({
          visible: false,
        })
      })
    },
    removeEventListeners() {
      document.removeEventListeners('mousemove')
      document.removeEventListeners('mouseout')
    },
  },

  beforeDestroy() {
    this.provider.destroy()
  },
}
</script>
