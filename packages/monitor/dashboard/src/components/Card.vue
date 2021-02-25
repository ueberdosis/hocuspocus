<template>
  <div class="shadow-xl bg-white px-4 pt-4 pb-2">
    <div class="text-xl font-bold" v-if="title">{{ title }}</div>
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
  },
}
</script>
