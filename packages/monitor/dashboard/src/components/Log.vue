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
        <tr
          v-for="(item, index) in log"
          :class="{ 'bg-gray-100': index % 2 === 1 }"
          :key="index"
        >
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
            <toggle>
              <pre class="text-xs text-gray-600 whitespace-pre-wrap">{{ item.details }}</pre>
            </toggle>
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
import Toggle from './Toggle'

const formatTime = timestamp => moment(timestamp).format('HH:mm:ss')

export default {
  components: {
    Card,
    Toggle,
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
        .toArray()
    },
  },

  methods: {
    mapper(item, index) {
      const handlers = {
        connections(data) {
          return {
            color: data.action === 'connected' ? 'green' : 'gray',
            details: { documentName: data.documentName },
            label: data.action,
            socket: '',
          }
        },

        documents(data) {
          return {
            color: data.action === 'created' ? 'blue' : 'yellow',
            details: { documentName: data.documentName, document: data.document },
            label: data.action,
            socket: '',
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
