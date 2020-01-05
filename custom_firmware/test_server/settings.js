'use strict';

let gSettings = {
    password: 'customfirmware',
    wifi: {
        ssid: 'Custom Firmware Example',
        password: 'customfirmware'
    }
};


exports.getPassword = function() {
    return gSettings.password;
}

exports.handleGetSettings = function(res) {
    let settings = {
        ...gSettings,
        wifi: {...gSettings.wifi}};

    delete settings.password;
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

    if(body.settings.password !== undefined)
        gSettings.password = body.settings.password || '';
    if(body.settings.wifi.ssid)
        gSettings.wifi.ssid = body.settings.wifi.ssid;
    if(body.settings.wifi.password !== undefined)
        gSettings.wifi.password = body.settings.wifi.password || '';

    console.log("New settings: ", JSON.stringify(gSettings, null, 4));
    res.end(JSON.stringify({success: true}));
}