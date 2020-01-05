<template><div>
    <div v-if="version">
        <form @submit.prevent="submit">
            <p>Currently installed version: {{ version }}</p>
            <table id="upload">
                <tr>
                    <td>File:<td>
                    <td><input type="file" id="file" ref="file" v-on:change="handleFileUpload()"/></td>
                </tr>
            </table>
            <p><input type="submit" value="Upload"> <span v-if="success" style="color: green">Success!</span><span v-if="error" style="color: red">{{ error }}</span><span v-if="progress">{{ progress }}</span></p>
            <p style="color: red" v-if="success">As uploading the firmware was successful, the device is now restarting. Please reload this page in a minute.</p>
        </form>
    </div>
    <div v-else>Loading...</div>
</div></template>

<script>
    export default {
        data() {
            return {
                version: null,
                file: false,

                // All used for the form submit handling
                error: '',
                success: false,
                progress: ''
            };
        },
        mounted() {
            this.fetchData();
        },
        methods: {
            handleFileUpload() {
                this.file = this.$refs.file.files[0];
            },
            async fetchData() {
                let res = await this.$http.post('/api/GetVersion', { token: this.$store.state.loginToken });
                if(res.status == 401)
                    this.$store.dispatch('logout');
                else {
                    this.version = res.data.version;
                }
            },
            submit() {
                this.success = false;
                if(!this.file) {
                    this.error = 'No file selected.';
                    return;
                }
                this.error = '';
                this.progress = '';

                let reader = new FileReader();
                reader.onload = async () => {
                    let res = await this.$http.post('/api/UploadFirmware?token=' + this.$store.state.loginToken, reader.result, {
                        onUploadProgress: (evt) => {
                            this.progress = evt.loaded + ' of ' + evt.total + ' bytes uploaded';
                        }
                    });
                    this.progress = '';

                    if(res.status == 401)
                        this.$store.dispatch('logout');
                    else {
                        if(res.data.error)
                            this.error = res.data.error;
                        if(res.data.success)
                            this.success = true;
                    }
                }
                reader.onerror = () => {
                    this.progress = '';
                    this.error = "Cannot read file.";
                }
                reader.readAsArrayBuffer(this.file);
            }
        }
    }
</script>