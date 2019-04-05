/*
 * index.js
 * The microcontroller application
 *
 * Cell phone controlled RC car built with JavaScript
 * See https://www.neonious-basics.com/?p=209 for the project details
 */

const http = require('http');
const fs = require('fs');

const gpio = require('gpio');
const signal = require('signal');

// The ws module must be installed. If you are not using the neonious one API but lowsync,
// you must copy the module and required submodules yourself
const WebSocket = require('ws');

// The pins of the motor. Connects to 
let pinMotorA = 20;
let pinMotorB = 21;
let pinMotorPWM = 25;

// The pin of the steering servo
let pinSteer = 17;

gpio.pins[pinMotorA].setType(gpio.OUTPUT).setValue(0);
gpio.pins[pinMotorB].setType(gpio.OUTPUT).setValue(0);
gpio.pins[pinMotorPWM].setType(gpio.OUTPUT).setValue(0);
gpio.pins[pinSteer].setType(gpio.OUTPUT).setValue(0);

// Serve a static file from the www directory
function writeStatic(path, res) {
    fs.readFile('/www/' + path, (err, data) => {
        if (err) {
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end('fs.readFile error: ' + err);
            return;
        }

        let contentType = 'text/html';
        if (path.substr(-4) == '.png')
            contentType = 'image/png';
        else if (path.substr(-3) == '.js')
            contentType = 'text/javascript';
        // add more if needed

        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
}

let httpServer = http.createServer(function (req, res) {
    writeStatic(req.url == '/' ? '/index.html' : req.url, res);
});
httpServer.listen(80);

let wss = new WebSocket.Server({ noServer: true });
wss.on('connection', function connection(ws) {
    ws.on('message', function incoming(data) {
        // Lets handle a message with coordinates. The message is a JSON in the format {x: ..., y: ...}. The coordinates are all between -1 and 1

        let vals = JSON.parse(data);
        if(vals.y < 0) {
            // Drive backwards
            gpio.pins[pinMotorA].setValue(0);
            gpio.pins[pinMotorB].setValue(1);
            gpio.pins[pinMotorPWM].setValue(vals.y <= -1 ? 1 : -vals.y);
        } else {
            // Drive forwards
            gpio.pins[pinMotorA].setValue(1);
            gpio.pins[pinMotorB].setValue(0);
            gpio.pins[pinMotorPWM].setValue(vals.y >= 1 ? 1 : vals.y);
        }

        // Send a pulse with a duration linear to the angle which we want to steer at
        // The formula is based on trial and error and depends on your actual servo
        // The pulse is sent again and again to keep the angle in place
    	signal.send(signal.RESTART, [{index: pinSteer, setEvents: signal.EVENT_1, clearEvents: signal.EVENT_2}], [0, 500000 + (vals.x * 0.1 + 0.41) * 2000000, 10000000], () => {});
    });
});

function upgradeToWSS(req, socket, head) {
    if (req.url === '/coords') {
        wss.handleUpgrade(req, socket, head, function done(ws) {
            wss.emit('connection', ws, req);
        });
    } else
        socket.destroy();
}
httpServer.on('upgrade', upgradeToWSS);