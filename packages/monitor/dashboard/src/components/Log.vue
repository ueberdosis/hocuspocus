<template>
  <card>
    <!-- fix for purgeCss -->
    <div class="hidden bg-gray-400 bg-green-400 bg-blue-400 bg-yellow-400">&nbsp;</div>

    <table class="table-auto w-full text-left text-sm">
      <thead>
        <tr>
          <th class="border-b-2 border-black py-2">Event</th>
          <th class="border-b-2 border-black py-2">Socket</th>
          <th class="border-b-2 border-black py-2">Document Name</th>
          <th class="border-b-2 border-black py-2">Time</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(item, index) in log"
          class="hover:bg-yellow-300"
          :key="index"
        >
          <td class="border-t border-black py-3">
            <span
              class="px-2 py-1 rounded text-sm"
              :class="{
                'bg-gray-400': item.color === 'gray',
                'bg-green-400': item.color === 'green',
                'bg-blue-400': item.color === 'blue',
                'bg-yellow-400': item.color === 'yellow',
              }"
              v-if="item.label"
            >
              {{ item.label }}
            </span>
          </td>
          <td class="border-t border-black py-3">{{ item.socket }}</td>
          <td class="border-t border-black py-3">{{ item.details }}</td>
          <td class="border-t border-black py-3">{{ item.time }}</td>
        </tr>
      </tbody>
    </table>
  </card>
</template>

<script>
import collect from 'collect.js'
import moment from 'moment'
import Card from './Card'

const formatTime = timestamp => moment(timestamp).format('HH:mm:ss')

export default {
  components: {
    Card,
  },

  props: {
    connections: {
      type: Array,
      required: true,
    },

    documents: {
      type: Array,
      required: true,
    },
  },

  data() {
    return {
      toggle: [],
    }
  },

  computed: {
    log() {
      return collect()
        .merge(this.connections)
        .merge(this.documents)
        .sortByDesc('timestamp')
        .values()
        .map((item, index) => this.mapper(item, index))
        .take(100)
        .toArray()
    },
  },

  methods: {
    mapper(item, index) {
      const handlers = {
        connectionLog(data) {
          return {
            color: data.action === 'connected' ? 'green' : 'gray',
            details: data.documentName,
            label: data.action,
            socket: data.socketId,
          }
        },

        documentLog(data) {
          return {
            color: data.action === 'created' ? 'blue' : 'yellow',
            details: data.documentName,
            label: data.action,
            socket: data.socketId,
          }
        },
      }

      const data = handlers[item.key] ? handlers[item.key](item.value) : {
        details: '',
        label: false,
        socket: '',
      }

      return {
        ...data,
        time: formatTime(item.timestamp),
      }
    },
  },
}
</script>
