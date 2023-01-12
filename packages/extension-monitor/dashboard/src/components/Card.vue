<template>
  <div
    :class="{'border-2 border-black rounded-xl overflow-hidden': border, 'h-full': fullHeight }"
    class="px-4 pt-4 pb-2"
  >
    <div
      class="uppercase text-sm font-bold mb-3"
      v-if="title"
    >
      {{ title }}
    </div>
    <slot />
  </div>
</template>

<script>
export default {
  props: {
    title: {
      type: String,
      default: null,
    },
    border: {
      type: Boolean,
      default: false,
    },
    fullHeight: {
      type: Boolean,
      default: false,
    },
  },
}
</script>
