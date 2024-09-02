<template>
  <div>
    <h1 class="text-3xl mb-8">
      Rooms
    </h1>

    <table class="border border-gray-300 w-full">
      <tr
        :key="room.name"
        v-for="room in rooms"
      >
        <td class="p-3 border border-gray-300">{{ room.name }}</td>
        <td class="p-3 border border-gray-300 text-center">{{ room.status }}</td>
        <td class="p-3 border border-gray-300 text-center">{{ room.numberOfUsers }}</td>
        <td class="p-3 border border-gray-300">{{ room.states }}</td>
        <td class="p-3 border border-gray-300 text-center">
          <button
            v-if="room.status === 'disconnected'"
            @click="room.connect()"
            class="border-2 border-black bg-black text-white px-4 py-2 rounded"
          >
            connect
          </button>

          <button
            v-else-if="room.status === 'connected'"
            @click="room.disconnect()"
            class="border-2 border-black px-4 py-2 rounded"
          >
            disconnect
          </button>
        </td>
      </tr>
    </table>
  </div>
</template>

<script lang="ts">
import * as Y from 'yjs'
import { ref } from 'vue'
import type { StatesArray } from '@hocuspocus/provider'
import { HocuspocusProvider } from '@hocuspocus/provider'
// eslint-disable-next-line import/no-extraneous-dependencies
import { awarenessStatesToArray } from '@hocuspocus/common'

class Room {
  doc = new Y.Doc()

  name = ''

  status = ref('disconnected')

  numberOfUsers = ref(0)

  states: StatesArray = []

  provider: HocuspocusProvider

  constructor(name: string) {
    this.name = name
    // this.provider = new WebsocketProvider('ws://localhost:1234', this.name, this.doc)
    this.provider = new HocuspocusProvider({
      url: 'ws://localhost:1234',
      document: this.doc,
      name: this.name,
      broadcast: false,
      connect: false,
      preserveConnection: false,
      onStatus: ({ status }) => {
        this.status.value = status
      },
      onAwarenessUpdate: ({ states }) => {
        this.states = states
        this.numberOfUsers.value = awarenessStatesToArray(this.provider.awareness.getStates()).filter((state => 'user' in state)).length
      },
      onDisconnect: () => {
        this.states = []
        this.numberOfUsers.value = 0
      },
    })

  }

  connect() {
    this.provider.setAwarenessField('user', { name: `Jon @ ${this.name}` })
    this.provider.connect()
  }

  disconnect() {
    this.provider.disconnect()
  }

  destroy() {
    this.provider.destroy()
  }
}

export default {
  data() {
    return {
      rooms: [] as Room[],
    }
  },

  mounted() {
    for (let i = 1; i < 5; i += 1) {
      this.rooms.push(new Room(`room-${i}`))
    }
  },

  beforeDestroy() {
    this.rooms.forEach(room => {
      room.destroy()
    })
  },
}
</script>
