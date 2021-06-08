import Vue from 'vue/dist/vue'
import Default from './pages/Default.vue'
import Awareness from './pages/Awareness.vue'
import Rooms from './pages/Rooms.vue'
import Layout from './Layout.vue'

const routes = {
  '/': Default,
  '/awareness': Awareness,
  '/rooms': Rooms,
}

Vue.component('Layout', Layout)

const app = new Vue({
  el: '#app',
  data: {
    currentRoute: window.location.pathname,
  },
  computed: {
    ViewComponent() {
      return routes[this.currentRoute]
    },
  },
  render(h) { return h(this.ViewComponent) },
})
