"use strict";

//   _____ ______ _______      ________ _____
//  / ____|  ____|  __ \ \    / /  ____|  __ \
// | (___ | |__  | |__) \ \  / /| |__  | |__) |
//  \___ \|  __| |  _  / \ \/ / |  __| |  _  /
//  ____) | |____| | \ \  \  /  | |____| | \ \
// |_____/|______|_|  \_\  \/   |______|_|  \_\
//

let http = require('http');
let fs = require('fs');
let gpio = require('gpio');
let signal = require('signal');
let events = require('events');

// SET PINS
// Photo Resistor pin
const photoResistorPin = 12;
gpio.pins[photoResistorPin].setType(gpio.INPUT);

// We only stream if somebody is connected to the web server
let numStreams = 0, streaming = false;

// This event emitter emits values as event 'data'.
// HTTP server connections listen to this
let radarEventEmitter = new events.EventEmitter();

// Remove comments to get live output into console log
// Note that console log right now still is syncronous on neonious one,
// so this slows down the animations. An asyncronious option would be
// to use fs.writeFile
// radarEventEmitter.on('data', console.log);

// measure the value of the luminosity and the calls itself when done ("recursive")
function getLuminosityData() {
	// Explicitly call garbage collector
	// (not really needed in newer versions of low.js)
	if(process && process.gc)
		process.gc();
	else
		require('neonious').gc();	// pre v1.1.0

	if(numStreams == 0) {
		// Stop reading if nobody connects via web browser
		streaming = false;
		return;
	}
	streaming = true;

	gpio.pins[photoResistorPin].getValue(gpio.ANALOG, (err, val) => {
		radarEventEmitter.emit('data', `{ "luminosity": ${val}, "timestamp": "${new Date()}" }\n`);
		getLuminosityData();
	});
}

function serveStaticResource(path, res) {
    fs.readFile('/www/' + path, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end('fs.readFile error: ' + err);
            return;
        }

        let contentType = 'text/html';
        if (path.substr(-4) == '.png')
            contentType = 'image/png';
        if (path.substr(-4) == '.css')
            contentType = 'text/css';
        else if (path.substr(-3) == '.js')
            contentType = 'text/javascript';

        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
}

http.createServer(function (req, res) {
    // GET LUMINOSITY
	if (req.url == '/GetLuminosity') {
		gpio.pins[photoResistorPin].getValue(gpio.ANALOG, (err, val) => {
			if (err) {
				res.writeHead(500);
				console.log('An error occurred while reading luminosity', err);
				res.end('Error gpio.pins[photoResistorPin].getValue ' + err);
				return;
			} else {
				console.log('Luminosity value = ', val);
				res.writeHead(200, {'Content-Type': 'application/json'});
				res.write(`{ "luminosity": ${val} }`);
				res.end();
			}
		});
    // GET LUMINOSITY AS DATA STREAM
    } else if (req.url == '/GetLuminosityStream') {
		// res.write is a prototype function
		// this does not work with on/off directly, wrap
		// into closure
        let resWrite = function(txt) {
			res.write(txt);
		};

		req.on('close', () => {
			radarEventEmitter.off('data', resWrite);
			numStreams--;
		});
		// Do not throw fatal exceptions
		res.on('error', () => {});
		req.on('error', () => {});

		radarEventEmitter.on('data', resWrite);
		numStreams++;

		if(!streaming) {
			getLuminosityData();
        }
    // STATIC SERVER
    } else {
        serveStaticResource(req.url == '/' ? '/index.html' : req.url, res);
    }
}).listen(80);

console.log('Web server streaming!');
