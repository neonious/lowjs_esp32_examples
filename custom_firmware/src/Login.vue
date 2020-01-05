<template><div>
    <form @submit.prevent="submit">
        Password: <input type="password" v-model="password">
        <input type="submit" value="Login">
        <span v-if="invalid" style="color: red">Invalid password!</span>
    </form>
</div></template>

<script>
export default {
    data() {
        return {
            password: '',
            invalid: false
        }
    },
    mounted() {
        this.$http.post('/api/Logout', { token: this.$store.state.loginToken });
        this.$store.commit('doLogoutOnLoginPage');
    },
    methods: {
        async submit() {
            this.invalid = false;

            let res = await this.$http.post('/api/Login', { password: this.password });
            if(res.status == 200) {
                this.$store.commit('goLoginOnLoginPage', res.data.token);
                this.$router.replace({name: "settings"});
            } else
                this.invalid = true;
        }
    }
}
</script>