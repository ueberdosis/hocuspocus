import Vue from 'vue'
import VueVirtualScroller from 'vue-virtual-scroller'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'
import App from './components/App.vue'

Vue.use(VueVirtualScroller)

new Vue({ render: createElement => createElement(App) }).$mount('#app')
