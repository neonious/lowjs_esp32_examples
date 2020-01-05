'use strict';

const VERSION               = 'v1.0.0 test server';

exports.handleGetVersion = function(res) {
    res.end(JSON.stringify({version: VERSION}));
}

exports.handleFirmware = function(req, res) {
    res.end(JSON.stringify({error: 'No support for updating the test server!'}));
    return;

    // In real life, data will be streamed to lowsys.createFirmwareStream
    let len = 0;
    req.on('data', (data) => {
        len += data.length;
    });
    req.on('end', () => {
        console.log("Firmware length: ", len);
        res.end(JSON.stringify({success: true}));
    });
}