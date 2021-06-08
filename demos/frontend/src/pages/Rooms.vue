<template>
  <Layout>
    <h1>
      Rooms
    </h1>

    <table border="1" cellpadding="5">
      <tr :key="room.name" v-for="room in rooms">
        <td>{{ room.name }}</td>
        <td>{{ room.status }}</td>
        <td>{{ room.numberOfUsers }}</td>
        <td>{{ room.states }}</td>
        <td>
          <button v-if="room.status !== 'connected'" @click="room.connect()">connect</button>
          <button v-if="room.status !== 'disconnected'" @click="room.disconnect()">disconnect</button>
        </td>
      </tr>
    </table>
  </Layout>
</template>

<script>
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
// import { HocuspocusProvider } from '../../../../packages/provider/src'
import { awarenessStatesToArray } from '../utils/awarenessStatesToArray'

class Room {
  doc = new Y.Doc()

  name = ''

  status = 'disconnected'

  states = []

  constructor(name) {
    this.name = name
    this.provider = new WebsocketProvider('ws://localhost:1234', this.name, this.doc)
    // this.provider = new HocuspocusProvider({
    //   url: 'ws://localhost:1234',
    //   document: this.doc,
    //   name: this.name,
    // })

    this.provider.on('status', event => {
      this.status = event.status
    })

    this.provider.awareness.setLocalStateField('user', { name: `Jon @ ${this.name}` })

    this.provider.awareness.on('change', () => {
      this.states = awarenessStatesToArray(this.provider.awareness.getStates())
    })

    this.states = awarenessStatesToArray(this.provider.awareness.getStates())
  }

  get numberOfUsers() {
    return this.provider.awareness.getStates().size
  }

  connect() {
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
      rooms: [],
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
