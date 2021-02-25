<template>
  <graph-card :data="data" metric="usage" title="CPU Usage">
    <template slot-scope="{ latest }">
      <div v-if="latest">
        {{ latest.usage }}% across all {{ latest.count }} cores
        <div class="text-gray-600 text-sm">{{ latest.model }}</div>
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
