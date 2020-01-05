import Vue from 'vue'
import axios from 'axios'
import App from './App.vue'
import router from './router'
import store from './store'

Vue.config.productionTip = false

Vue.prototype.$http = axios;
axios.defaults.validateStatus = (status) => { return status == 200 || status == 401; }

/*
axios.defaults.timeout = 20000;
Vue.config.errorHandler = (err) => {
    alert('An error occurred. Please make sure the connection to the device is stable and try again!');
};
*/

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app')
