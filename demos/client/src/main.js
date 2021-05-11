import Vue from 'vue/dist/vue'
import App from './App.vue'

Vue.component('App', App)

const app = new Vue({
  el: '#app',
  template: '<App />',
})
