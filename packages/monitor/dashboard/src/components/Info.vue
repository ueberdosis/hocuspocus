<template>
  <div class="shadow-xl bg-white px-4 pt-4 pb-2">
    <div class="text-xl font-bold">Info</div>
    <p>
      Node.js version: <span class="text-gray-600">{{ info.version }}</span>
    </p>
    <p>
      Platform: <span class="text-gray-600">{{ info.platform }}</span>
    </p>
    <p>
      Started: <span class="text-gray-600">{{ started }}</span>
    </p>
    <div class="text-xl font-bold mt-6">Configuration</div>
    <pre />
  </div>
</template>

<script>
import moment from 'moment'

export default {
  props: {
    info: {
      type: Object,
      required: true,
    },
  },

  computed: {
    started() {
      return moment().subtract(this.info.uptime, 'seconds').fromNow()
    },
  },
}
</script>
