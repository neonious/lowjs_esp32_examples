import Vue from 'vue'
import VueRouter from 'vue-router'
import Login from '../Login.vue'
import Settings from '../views/Settings.vue'
import Update from '../views/Update.vue'

Vue.use(VueRouter);

const routes = [
  {
    path: '/',
    redirect: {
        name: "login"
    }
  },
  {
    name: 'login',
    path: '/Login',
    component: Login
  },
  {
    name: 'settings',
    path: '/Settings',
    component: Settings
  },
  {
    name: 'update',
    path: '/Update',
    component: Update
  }
]

const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes
})

export default router
