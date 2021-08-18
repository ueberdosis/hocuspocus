<template>
  <div class="page">
    <nav>
      <ul>
        <li><router-link to="/">Default</router-link></li>
        <li><router-link to="/awareness">Awareness</router-link></li>
        <li><router-link to="/rooms">Rooms</router-link></li>
        <li><router-link to="/messages">Messages</router-link></li>
        <li><router-link to="/subdocuments">Subdocuments</router-link></li>
      </ul>
    </nav>
    <router-view />
  </div>
</template>

<script>
import routes from 'virtual:generated-pages'
// import { RouterView } from 'vue-router'

export default {
  // components: {
  //   RouterView,
  // },
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
