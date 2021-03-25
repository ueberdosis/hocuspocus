import Vue from 'vue'
import VueVirtualScroller from 'vue-virtual-scroller'
import App from './components/App.vue'

Vue.use(VueVirtualScroller)

new Vue({ render: createElement => createElement(App) }).$mount('#app')
