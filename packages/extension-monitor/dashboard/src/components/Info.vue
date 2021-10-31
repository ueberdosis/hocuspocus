<template>
  <card title="Info" :border="true" :full-height="true">
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
      Public IP: <span class="text-gray-600">{{ info.ipAddress }}</span>
    </p>
    <p>
      Started: <span class="text-gray-600">{{ started }}</span>
    </p>
    <div class="uppercase text-sm font-bold mb-3 mt-8">Configuration</div>
    <pre class="text-xs bg-black text-white px-3 py-3 rounded-xl">{{ info.configuration }}</pre>
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
