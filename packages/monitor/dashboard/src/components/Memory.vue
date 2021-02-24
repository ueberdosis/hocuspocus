<template>
  <div class="shadow-xl bg-white px-4 pt-4 pb-2">
    <div class="text-xl font-bold mb-2">Memory usage</div>
    <p>
      {{ toMegaBytes(current.memoryTotal - current.memoryFree) }}
      of {{ toMegaBytes(current.memoryTotal) }} used
      ({{ percentage(current) }}%)
    </p>
    <plotly
      :data="memoryUsage"
      :layout="{
        title: false,
        showlegend: false,
      }"
      :static-plot="true"
    />
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

    max: {
      type: Number,
      default: 10,
    },
  },

  computed: {
    filtered() {
      return collect(this.data)
        .where('value.memoryTotal')
        .where('value.memoryFree')
        .toArray()
    },

    current() {
      return this.filtered[this.filtered.length - 1]?.value || {
        memoryFree: 0,
        memoryTotal: 0,
        cpus: [],
      }
    },

    memoryUsage() {
      const data = [
        {
          x: [],
          y: [],
          type: 'scatter',
        },
      ]

      this.filtered.forEach((item, index) => {
        if (this.limitReached(index)) return

        data[0].x.push(item.key)
        data[0].y.push(this.percentage(item.value))
      })

      return data
    },
  },

  methods: {
    toMegaBytes(value) {
      return `${Math.round(value / 1024 / 1024)} Mb`
    },

    percentage(value) {
      return Math.round((
        (value.memoryTotal - value.memoryFree) / value.memoryTotal
      ) * 100)
    },

    limitReached(index) {
      return this.data.length > this.max && (this.data.length - this.max) > index
    },
  },
}
</script>
