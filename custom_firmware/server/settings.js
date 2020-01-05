'use strict';

const fs = require('fs');
const lowsys = require('lowsys');

let gPassword = fs.readFileSync('/PASSWORD', 'utf8');

exports.getPassword = function() {
    return gPassword;
}

exports.handleGetSettings = function(res) {
    let wifi = lowsys.settings.wifi;
    let settings = {
        wifi: {
            ssid: wifi.ssid,
            password: wifi.password
        }};
    settings.wifi.password = settings.wifi.password !== '';

    res.end(JSON.stringify({settings}));
}

exports.handleSetSettings = function(body, res) {
    let error = {wifi: {}};
    let hasError = false;
    if(body.settings.password && body.settings.password.length > 0 && body.settings.password.length < 4) {
        error.password = 'Too short';
        hasError = true;
    }
    if(body.settings.wifi.ssid && body.settings.wifi.ssid.length > 0 && body.settings.wifi.ssid.length < 4) {
        error.wifi.ssid = 'Too short';
        hasError = true;
    }
    if(body.settings.wifi.password && body.settings.wifi.password.length > 0 && body.settings.wifi.password.length < 4) {
        error.wifi.password = 'Too short';
        hasError = true;
    }
    if(hasError) {
        res.end(JSON.stringify({error}));
        return;
    }

    if(body.settings.password !== undefined) {
        gPassword = body.settings.password || '';
        fs.writeFile('/PASSWORD', gPassword, () => {});
    }

    let wifi = {};
    if(body.settings.wifi.ssid)
        wifi.ssid = body.settings.wifi.ssid;
    if(body.settings.wifi.password !== undefined)
        wifi.password = body.settings.wifi.password || '';

    res.end(JSON.stringify({success: true}));
    if(body.settings.wifi.ssid || body.settings.wifi.password !== undefined)
        setTimeout(() => { lowsys.setSettings({wifi}); }, 3000);
}