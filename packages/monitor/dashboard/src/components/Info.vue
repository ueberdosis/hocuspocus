<template>
  <card title="Info">
    <p>
      hocuspocus version: <span class="text-gray-600">{{ info.version }}</span>
    </p>
    <p>
      Node.js version: <span class="text-gray-600">{{ info.nodeVersion }}</span>
    </p>
    <p>
      Platform: <span class="text-gray-600">{{ info.platform }}</span>
    </p>
    <p>
      Started: <span class="text-gray-600">{{ started }}</span>
    </p>
    <div class="text-xl font-bold mt-6 mb-2">Configuration</div>
    <pre class="text-xs text-gray-600">{{ info.configuration }}</pre>
  </card>
</template>

<script>
import moment from 'moment'
import Card from './Card'

export default {
  components: {
    Card,
  },

  props: {
    info: {
      type: Object,
      required: true,
    },
  },

  data() {
    return {
      started: '',
      interval: null,
    }
  },

  created() {
    this.interval = setInterval(() => {
      this.started = moment(this.info.started).fromNow()
    }, 1000)
  },

  beforeDestroy() {
    clearInterval(this.interval)
  },
}
</script>
