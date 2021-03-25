<template>
  <card>
    <!-- fix for purgeCss -->
    <div class="hidden bg-gray-400 bg-green-400 bg-blue-400 bg-yellow-400">&nbsp;</div>

    <div class="flex flex-col text-sm">
      <div class="flex items-stretch border-b-2 border-black font-bold py-2">
        <div class="flex-grow flex-shrink-0" style="flex-basis: 6rem;">Event</div>
        <div class="flex-grow flex-shrink-0" style="flex-basis: 15rem;">Socket</div>
        <div class="flex-grow flex-shrink-0" style="flex-basis: 20rem;">Document Name</div>
        <div class="flex-grow flex-shrink-0" style="flex-basis: 6rem;">Time</div>
      </div>

      <RecycleScroller
        :items="log"
        :item-size="32"
        v-slot="{ item }"
      >
        <div
          class="flex border-t border-black py-3 hover:bg-yellow-300 items-stretch"
        >
          <div class="flex-grow flex-shrink-0" style="flex-basis: 6rem;">
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
          </div>
          <div class="flex-grow flex-shrink-0" style="flex-basis: 15rem;">{{ item.socket }}</div>
          <div class="flex-grow flex-shrink-0" style="flex-basis: 20rem;">{{ item.details }}</div>
          <div class="flex-grow flex-shrink-0" style="flex-basis: 6rem;">{{ item.time }}</div>
        </div>
      </RecycleScroller>
    </div>
  </card>
</template>

<script>
import collect from 'collect.js'
import moment from 'moment'
import Card from './Card'

const formatTime = timestamp => moment(timestamp)
  .format('HH:mm:ss')

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
        id: index,
        time: formatTime(item.timestamp),
      }
    },
  },
}
</script>
