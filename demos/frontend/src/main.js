import Vue from 'vue/dist/vue'
import routes from 'virtual:generated-pages'
import VueRouter from 'vue-router'
import StatusBar from './components/StatusBar.vue'
import App from './App.vue'

Vue.component('StatusBar', StatusBar)

const router = new VueRouter({
  routes,
})

Vue.use(VueRouter)

const app = new Vue({
  router,
  components: {
    App,
  },
  template: '<App />',
}).$mount('#app')
