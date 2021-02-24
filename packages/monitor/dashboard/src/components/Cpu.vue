<template>
  <div class="shadow-xl bg-white px-4 pt-4 pb-2">
    <div class="text-xl font-bold">CPU usage</div>
    <p>
      {{ current.cpu.usage }}% across all {{ current.cpu.count }} cores
    </p>
    <div class="-ml-4 -mr-4 -mb-12">
      <plotly
        :data="cpuUsage"
        :layout="{
          paper_bgcolor: 'rgba(0,0,0,0)',
          plot_bgcolor: 'rgba(0,0,0,0)',
          title: false,
          showlegend: false,
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
            range: [0,100],
          }
        }"
        :display-mode-bar="false"
        :scrool-zoom="false"
      />
    </div>
  </div>
</template>

<script>
import collect from 'collect.js'
import { Plotly } from 'vue-plotly'

export default {
  components: {
    Plotly,
  },

  props: {
    data: {
      type: Array,
      required: true,
    },
  },

  computed: {
    filtered() {
      return collect(this.data)
        .where('value.cpu')
        .toArray()
    },

    current() {
      return this.filtered[this.filtered.length - 1]?.value || {
        cpu: {
          usage: 0,
          count: 0,
        },
      }
    },

    cpuUsage() {
      const data = [
        {
          x: [],
          y: [],
          fill: 'tozeroy',
          mode: 'none',
          type: 'scatter',
        },
      ]

      this.filtered.forEach(item => {
        data[0].x.push(item.key)
        data[0].y.push(item.value.cpu.usage)
      })

      return data
    },
  },
}
</script>
