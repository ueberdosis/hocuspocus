import Vue from 'vue/dist/vue'
import routes from 'virtual:generated-pages'
import VueRouter from 'vue-router'
import StatusBar from './Components/StatusBar.vue'
import App from './App.vue'
import '../index.css'

Vue.component('StatusBar', StatusBar)

const router = new VueRouter({
  mode: 'history',
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
