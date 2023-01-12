<template>
  <card
    :title="title"
    :border="true"
  >
    <div>
      <div>
        <slot :latest="latest" />
      </div>
      <div class="-ml-4 -mr-4 -mb-12">
        <plotly
          :data="graph"
          :display-mode-bar="false"
          :layout="computedLayout"
          :scrool-zoom="false"
        />
      </div>
    </div>
  </card>
</template>

<script>
import { Plotly } from 'vue-plotly'
import Card from './Card'

const defaultLayout = {
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
  },
  yaxis: {
    showgrid: true,
    zeroline: false,
    range: [0, 100],
  },
}

export default {
  components: {
    Card,
    Plotly,
  },

  props: {
    title: {
      type: String,
      default: null,
    },

    data: {
      type: Array,
      required: true,
    },

    metric: {
      type: String,
      required: true,
    },

    layout: {
      type: Object,
      default() {
        return {}
      },
    },

    max: {
      type: Number,
      default: 24,
    },
  },

  computed: {
    start() {
      return this.data[this.data.length > this.max ? (this.data.length - this.max) : 0]?.timestamp
    },

    end() {
      return this.data[this.data.length - 1]?.timestamp
    },

    latest() {
      return this.data[this.data.length - 1]?.value
    },

    graph() {
      const data = [
        {
          x: [],
          y: [],
          fill: 'tozeroy',
          mode: 'none',
          type: 'scatter',
        },
      ]

      this.data.forEach(item => {
        data[0].x.push(item.timestamp)
        data[0].y.push(item.value[this.metric])
      })

      return data
    },

    computedLayout() {
      const layout = {
        ...defaultLayout,
        ...this.layout,
      }

      layout.xaxis.range = [this.start, this.end]

      return layout
    },
  },
}
</script>
