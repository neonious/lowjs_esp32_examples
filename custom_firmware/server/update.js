'use strict';

const fs = require('fs');
const lowsys = require('lowsys');

let version = fs.readFileSync('/VERSION', 'utf8');

exports.handleGetVersion = function(res) {
    res.end(JSON.stringify({version}));
}

exports.handleFirmware = function(req, res) {
    let stream;
    try {
      stream = lowsys.createFirmwareStream();
    } catch(e) {
      res.end(JSON.stringify({
        error: e.message
      }));
      return;
    }
  
    req.on('data', (data) => {
        stream.write(data);
    });
    req.on('end', () => {
        stream.end();
    });

    let done = false;
    stream.on('error', (e) => {
        if(done)
            return;
        done = true;
        stream.destroy();

        res.end(JSON.stringify({error: e.message}));
    });
    stream.on('finish', () => {
        if(done)
            return;
        done = true;
        stream.destroy();

        res.end(JSON.stringify({success: true}));
        setTimeout(() => {
            lowsys.restart(true);
        }, 5000);
    });
}