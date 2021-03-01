<template>
  <card title="Metrics">
    <div>
      <div v-if="latestConnection && latestDocument">
        Currently active connections: {{ latestConnection.count }}<br>
        <div class="text-gray-600 text-sm">Total messages sent: {{ totalMessagesSent }}, Total documents created: {{ latestDocument.count }}</div>
      </div>
      <div class="-ml-4 -mr-4 -mb-12">
        <plotly
          :data="graph"
          :display-mode-bar="false"
          :layout="{
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            showlegend: false,
            title: false,
            margin: {
              l: 0,
              r: 0,
              b: 40,
              t: 40,
            },
            xaxis: {
              showgrid: true,
              zeroline: true,
              visible: false,
              range: [ start, end ],
            },
            yaxis: {
              showgrid: true,
              zeroline: false,
              fixedrange: true,
            },
          }"
          :scrool-zoom="false"
        />
      </div>
    </div>
  </card>
</template>

<script>
import { Plotly } from 'vue-plotly'
import collect from 'collect.js'
import Card from './Card'

export default {
  components: {
    Card,
    Plotly,
  },

  props: {
    connectionCount: {
      type: Array,
      required: true,
    },

    messageCount: {
      type: Array,
      required: true,
    },

    documentCount: {
      type: Array,
      required: true,
    },

    max: {
      type: Number,
      default: 24,
    },
  },

  computed: {
    start() {
      return this.connectionCount[this.connectionCount.length > this.max ? this.connectionCount.length - this.max : 0]?.timestamp
    },

    end() {
      return this.connectionCount[this.connectionCount.length - 1]?.timestamp
    },

    totalMessagesSent() {
      return collect(this.messageCount).reduce((carry, item) => carry += item.value.count)
    },

    latestDocument() {
      return this.documentCount[this.documentCount.length - 1]?.value
    },

    latestConnection() {
      return this.connectionCount[this.connectionCount.length - 1]?.value
    },

    graph() {
      const data = [
        {
          x: [],
          y: [],
          mode: 'lines',
          name: 'Connections',
        },
        {
          x: [],
          y: [],
          mode: 'lines',
          name: 'Messages',
        },
        {
          x: [],
          y: [],
          mode: 'lines',
          name: 'Documents',
        },
      ]

      this.connectionCount.forEach(item => {
        data[0].x.push(item.timestamp)
        data[0].y.push(item.value.count)
      })

      this.messageCount.forEach(item => {
        data[1].x.push(item.timestamp)
        data[1].y.push(item.value.count)
      })

      this.documentCount.forEach(item => {
        data[2].x.push(item.timestamp)
        data[2].y.push(item.value.count)
      })

      return data
    },
  },
}
</script>
