<template>
  <div
    class="relative"
    :class="{ 'overflow-hidden': !open, 'h-20': !open }"
  >
    <div
      class="absolute top-0 right-0 font-bold cursor-pointer"
      @click="open = !open"
    >
      <span v-if="open">↑</span>
      <span v-else>↓</span>
    </div>
    <div
      class="absolute bottom-0 left-0 right-0 bg-gradient-to-b from-transparent to-white h-4"
      v-if="!open"
    >
      &nbsp;
    </div>
    <slot />
  </div>
</template>

<script>
export default {
  data() {
    return {
      open: false,
    }
  },
}
</script>
