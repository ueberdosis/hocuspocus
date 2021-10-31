<template>
  <graph-card :data="data" metric="usage" title="Memory Usage">
    <template slot-scope="{ latest }">
      <div v-if="latest">
        {{ Math.floor(latest.total - latest.free) }}Mb is used ({{ Math.round(latest.usage * 100) / 100 }}%)
        <div class="text-gray-600 text-sm">{{ latest.total }}Mb in total</div>
      </div>
    </template>
  </graph-card>
</template>

<script>
import GraphCard from './GraphCard'

export default {
  components: {
    GraphCard,
  },

  props: {
    data: {
      type: Array,
      required: true,
    },
  },
}
</script>
