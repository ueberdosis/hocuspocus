<template>
  <div class="page">
    <nav>
      <ul>
        <li><a href="/">Default</a></li>
        <li><a href="/awareness">Awareness</a></li>
        <li><a href="/rooms">Rooms</a></li>
        <li><a href="/messages">Messages</a></li>
        <li><a href="/subdocuments">Subdocuments</a></li>
      </ul>
    </nav>
    <router-view />
  </div>
</template>

<script>
import routes from 'virtual:generated-pages'
import { RouterView } from 'vue-router'

export default {
  components: {
    RouterView,
  },
  mounted() {
    console.log(routes)
  },
}
</script>

<style>
.page {
  font-family: sans-serif;
}
</style>
