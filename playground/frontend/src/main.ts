import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
// @ts-ignore
import App from './App.vue'
// @ts-ignore
import routes from '~pages'

const router = createRouter({
  history: createWebHistory(),
  routes,
})

createApp(App).use(router).mount('#app')
