<template>
  <card>
    <table class="table-auto w-full text-left">
      <thead>
        <tr>
          <th class="px-4 py-2">Event</th>
          <th class="px-4 py-2">Socket</th>
          <th class="px-4 py-2">Details</th>
          <th class="px-4 py-2">Time</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(item, index) in log" :class="{ 'bg-gray-100': index % 2 === 1 }">
          <td class="border px-4 py-2">
            <span
              class="px-2 py-1 rounded text-sm"
              :class="`bg-${item.color}-400`"
              v-if="item.label"
            >
              {{ item.label }}
            </span>
          </td>
          <td class="border px-4 py-2">
            <span class="text-sm text-gray-600">{{ item.socket }}</span>
          </td>
          <td class="border px-4 py-2">
            <pre class="text-xs text-gray-600">{{ item.details }}</pre>
          </td>
          <td class="border px-4 py-2">
            <span class="text-sm text-gray-600">{{ item.time }}</span>
          </td>
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
  },

  computed: {
    log() {
      return collect(this.connections)
        .sortByDesc('timestamp')
        .map(item => this.mapper(item))
        .toArray()
    },
  },

  methods: {
    mapper(item) {
      const handlers = {

        connections(data) {
          return {
            color: data.action === 'connected' ? 'green' : 'gray',
            details: { documentName: data.documentName },
            label: data.action,
            socket: '',
            time: formatTime(item.timestamp),
          }
        },

      }

      return handlers[item.key] ? handlers[item.key](item.value) : {
        details: '',
        label: false,
        timestamp: item.timestamp,
      }
    },
  },
}
</script>
