'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const urlMod = require('url');

const settings = require('./settings');
const update = require('./update');

const wwwPath = path.join(__dirname, '../dist');

let gLoginTokens = {};

const SESSION_TIMEOUT_MS = 2 * 3600 * 1000;

function handleStatic(url, req, res) {
    var url = url == '/' ? '/index.html' : req.url;

    // add more as required...
    let contentType;
    let pos = url.lastIndexOf('.');
    if(pos == -1)
        contentType = 'text/html';
    else {
        let ending = url.substr(pos + 1);
        if(ending == 'html')
            contentType = 'text/html; charset=utf-8';
        else if(ending == 'js')
            contentType = 'application/javascript; charset=utf-8';
        else if(ending == 'map')
            contentType = 'application/json; charset=utf-8';
        else if(ending == 'png')
            contentType = 'image/png';
        else if(ending == 'ico')
            contentType = 'image/x-icon';
        else if(ending == 'css')
            contentType = 'text/css; charset=utf-8';
        else {
            contentType = 'text/plain';
            console.error('unknown content type for ', url);
        }
    }
    res.setHeader("Content-Type", contentType);

    console.log('streaming ' + url);

    let stream = fs.createReadStream(wwwPath + url);
    stream.on('error', (err) => {
        let stream = fs.createReadStream(wwwPath + '/index.html');
        stream.on('error', (err) => {
            res.statusCode = 500;
            res.end();
        });
        stream.pipe(res);
    });
    stream.pipe(res);
}

function handleAPI(action, req, res, url) {
    console.log('api call ' + action);

    let now = new Date().getTime();

    if(action == 'UploadFirmware') {
        let tim = gLoginTokens[url.query.token];
        if(tim === undefined || now - tim >= SESSION_TIMEOUT_MS) {
            res.statusCode = 401;
            res.end();
            return;
        }
        gLoginTokens[url.query.token] = now;

        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        update.handleFirmware(req, res);
        return;
    }

    let body = [];
    let len = 0;

    req.on('data', (data) => {
        len += data.length;
        if(len >= 128 * 1024) {
            res.statusCode = 500;
            res.end();
        } else
            body.push(data);
    });
    req.on('end', () => {
        try {
            body = JSON.parse(Buffer.concat(body));
        } catch(e) {
            res.statusCode = 500;
            res.end();
            return;
        }

        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        if(action == 'Login') {
            if(body.password != settings.getPassword()) {
                res.statusCode = 401;
                res.end();
                return;
            }

            let token, tim;
            do {
                token = crypto.randomBytes(12).toString('hex');
                tim = gLoginTokens[token];
            } while(tim !== undefined && now - tim < SESSION_TIMEOUT_MS);

            gLoginTokens[token] = now;
            console.log("CALLING END WITH ", JSON.stringify({token}));
            res.end(JSON.stringify({token}));
            return;
        } else if(action == 'Logout') {
            delete gLoginTokens[body.token];
            res.end('{}');
        } else {
            let tim = gLoginTokens[body.token];
            if(tim === undefined || now - tim >= SESSION_TIMEOUT_MS) {
                res.statusCode = 401;
                res.end();
                return;
            }
            gLoginTokens[body.token] = now;

            if(action == 'GetSettings')
                settings.handleGetSettings(res);
            else if(action == 'SetSettings')
                settings.handleSetSettings(body, res);
            else if(action == 'GetVersion')
                update.handleGetVersion(res);
            else {
                res.statusCode = 404;
                res.end();
            }
        }
    });
}

function handleRequest(req, res) {
    let url = urlMod.parse(req.url, true);
    if(url.pathname.substr(0, '/api/'.length) == '/api/')
        handleAPI(url.pathname.substr('/api/'.length), req, res, url);
    else
        handleStatic(url.pathname, req, res);
}

let httpServer = http.createServer(handleRequest).listen(80, function (err) {
    if (!err)
        console.log('listening on http://localhost:' + httpServer.address().port + '/');
});
