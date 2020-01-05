<template><div>
    <div v-if="loaded">
        <form @submit.prevent="submit">
            <table id="settings">
                <tr>
                    <td>Password:<td>
                    <td><input type="password" placeholder="Enter to change" v-model="settings.password">
                    <td style="color: red" v-if="error.password">{{ error.password }}</td>
                </tr>
                <tr>
                    <td colspan="2">&nbsp;<br><b>Wifi</b><td>
                </tr>
                <tr>
                    <td>SSID:<td>
                    <td><input type="text" v-model="settings.wifi.ssid">
                    <td style="color: red" v-if="error.wifi.ssid">{{ error.wifi.ssid }}</td>
                </tr>
                <tr>
                    <td>Password:<td>
                    <td><input type="checkbox" v-model="hasWifiPassword"> <input type="password" placeholder="Enter to change" v-model="settings.wifi.password">
                    <td style="color: red" v-if="error.wifi.password">{{ error.wifi.password }}</td>
                </tr>
            </table>
            <p><input type="submit" value="Save"> <span v-if="success" style="color: green">Success!</span></p>
            <p style="color: red" v-if="wifiWarning">As you changed the Wifi settings, your connection might go down now. In this case, please reconnect to the Wifi and reload.</p>
        </form>
    </div>
    <div v-else>Loading...</div>
</div></template>

<script>
    export default {
        data() {
            return {
                loaded: false,
                settings: null,
                hasWifiPassword: false,

                // All used for the form submit handling
                originalWifiSSID: '',
                success: false,
                wifiWarning: false,
                error: {wifi: {}}
            };
        },
        mounted() {
            this.fetchData();
        },
        methods: {
            async fetchData() {
                let res = await this.$http.post('/api/GetSettings', { token: this.$store.state.loginToken });
                if(res.status == 401)
                    this.$store.dispatch('logout');
                else {
                    this.originalWifiSSID = res.data.settings.wifi.ssid;

                    this.hasWifiPassword = res.data.settings.wifi.password;
                    res.data.settings.password = '';
                    res.data.settings.wifi.password = '';
                    this.settings = res.data.settings;

                    this.loaded = true;
                }
            },
            async submit() {
                let settings = {
                    password: this.settings.password === '' ? undefined : this.settings.password,
                    wifi: {
                        ssid: this.settings.wifi.ssid,
                        password: this.hasWifiPassword ? (this.settings.wifi.password === '' ? undefined : this.settings.wifi.password) : null
                    }
                };

                this.success = false;
                this.wifiWarning = false;
                this.error = {wifi: {}};

                let res = await this.$http.post('/api/SetSettings', { token: this.$store.state.loginToken,
                    settings });
                if(res.status == 401)
                    this.$store.dispatch('logout');
                else {
                    if(res.data.error)
                        this.error = res.data.error;
                    if(res.data.success) {
                        this.success = true;
                        if(settings.wifi.ssid !== this.originalWifiSSID || settings.wifi.password !== undefined)
                            this.wifiWarning = true;
                    }
                }
            }
        }
    }
</script>