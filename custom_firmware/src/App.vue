<template>
  <div id="app">
    <h1>low.js Example Program</h1>
    <div v-if="authenticated" id="nav">
      <router-link to="/Settings">Settings</router-link>
      <router-link to="/Update">Update</router-link>
      <router-link to="/Login">Logout</router-link>
    </div>
    <router-view/>
  </div>
</template>

<style>
#nav {
    float: left;
    width: 200px;
}

#nav a {
    display: block;
    padding: 10px;
    margin-bottom: 10px;
    margin-right: 20px;
    background-color: #cccccc;
    border-radius: 10px;
    text-decoration: none;
    color: black;
    text-align: center;
}

#nav a:hover {
    background-color: #ddc099;
}

#nav a.router-link-active {
    background-color: #ffa500 !important;
}
</style>

<script>
    export default {
        name: 'App',
        computed: {
            authenticated() {
                return this.$store.state.loginToken !== null;
            }
        },
        methods: {
            logout() {
                this.$store.commit('logout');
            }
        }
    }
</script>