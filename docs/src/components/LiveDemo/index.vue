<template>
  <div class="live-demo">
    <template v-if="file">
      <div class="live-demo__preview">
        <vue-live
          :code="file.content"
          :layout="CustomLayout"
          :requires="requires"
        />
      </div>
      <div class="live-demo__meta">
        <div class="live-demo__name">
          Demo/{{ name }}
        </div>
        <a class="live-demo__link" :href="githubUrl" target="_blank">
          Edit on GitHub →
        </a>
      </div>
    </template>
    <div v-else class="live-demo__error">
      Could not find a demo called “{{ name }}”.
    </div>
  </div>
</template>

<script>
import { VueLive } from 'vue-live'
import CustomLayout from './CustomLayout'

export default {
  components: {
    VueLive,
  },

  props: {
    name: {
      type: String,
      required: true,
    },
  },

  data() {
    return {
      files: [],
      content: null,
      currentIndex: 0,
      CustomLayout,
      syntax: {
        vue: 'html',
      },
    }
  },

  computed: {
    requires() {
      return {}
    },

    file() {
      return this.files[0]
    },

    githubUrl() {
      return `https://github.com/ueberdosis/tiptap-next/tree/main/docs/src/demos/${this.name}`
    },
  },
}
</script>

<style lang="scss" src="./style.scss" scoped />
