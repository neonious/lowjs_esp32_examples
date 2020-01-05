import Vue from 'vue'
import Vuex from 'vuex'
import router from '../router'

Vue.use(Vuex)

export default new Vuex.Store({
  state: {
    loginToken: null
  },
  mutations: {
    goLoginOnLoginPage(state, token) {
        state.loginToken = token;
    },
    doLogoutOnLoginPage(state) {
        state.loginToken = null;
    }
  },
  actions: {
    logout() {
        router.replace({name: "login"});
    }
  }
})
