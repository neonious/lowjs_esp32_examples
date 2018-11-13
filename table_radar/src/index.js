"use strict";

// -----------------------------------------------------------------------------
//	tableradar - /src/index.js
//	Written by Thomas Rogg <thomas@neonious.com>, public domain
//
//	Example program for neonious one Technology Preview
//	More information: http://www.neonious.com/
//
//  05/25/2018 - initial version
//  09/05/2018 - changes for program to work with neonious one software v1.1.0
// -----------------------------------------------------------------------------

let http = require('http');
let fs = require('fs');
let gpio = require('gpio');
let signal = require('signal');
let events = require('events');

// This event emitter emits angle and distance sensor voltage
// as event 'data'. HTTP server connections listen to this
let radarEventEmitter = new events.EventEmitter();

/*
// Remove comments to get live output into console log
// Note that console log right now still is syncronous on neonious one,
// so this slows down the animations. An asyncronious option would be
// to use fs.writeFile
radarEventEmitter.on('data', console.log);
*/

// Set base level of servo signal to low
gpio.pins[6].setType(gpio.OUTPUT);
gpio.pins[6].setValue(0);

// We only do the radar if somebody conencts to our website
let numStreams = 0, running = false;

let last_ms = new Date().getTime();
let angle = 0, dir = 1;

// radarStep
// does one radar step by moving servo + getting distance sensor voltage
// calls itself when both is done
function radarStep() {
	// Explicitly call garbage collector to keep animation smooth
	// (we plan on making garbage collection better, to remove the need
	// for this)
	if(process && process.gc)
		process.gc();
	else
		require('neonious').gc();	// pre v1.1.0

	if(numStreams == 0) {
		// Stop animating if nobody connects via web browser
		running = false;
		return;
	}
	running = true;

	// Go back and forth.. left, right, left
	let ms = new Date().getTime();
	let dur = ms - last_ms;
	last_ms = ms;
	angle += dir * dur * 0.0005;
	if(angle >= Math.PI) {
		dir = -1;
		angle = Math.PI;
	}
	if(angle <= 0) {
		dir = 1;
		angle = 0;
	}

	let donePart = 0;
	// Step 1/2: Get distance sensor voltage and emit data
	gpio.pins[8].getValue(gpio.ANALOG, (err, val) => {
		radarEventEmitter.emit('data', angle + " " + val + "\n");
		if(++donePart == 2)
			radarStep();
	});
	// Step 2/2: Move servo motor
	// Done by sending a signal between 500 us and 2000 us (2 ms), depending on the angle
	// wanted.
	// We are working to support custom I/O protocols. But you can already use neonious one
	// to output arbritary short signals with up to 6 pins in nanosecond range, what we are
	// doing here
	signal.send(signal.ONESHOT, [{index: 6, setEvents: signal.EVENT_1, clearEvents: signal.EVENT_2}], [0, 500000 + angle * 2000000 / Math.PI], () => {
		if(++donePart == 2)
			radarStep();
	});
}

// Outputs a static file from /www directory
function writeStatic(path, res) {
    fs.readFile('/www/' + path, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end('fs.readFile error: ' + err);
            return;
        }

        let contentType = 'text/html';
        if (path.substr(-4) == '.png')
            contentType = 'image/png';
        else if (path.substr(-3) == '.js')
            contentType = 'text/javascript';

        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
}

// Our table radar is accessable over http!
http.createServer(function (req, res) {
	// The data stream
    if (req.url == '/DataStream') {
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

		if(!running)
			radarStep();
    } else {
    	// Output static file
        writeStatic(req.url == '/' ? '/index.html' : req.url, res);
    }
}).listen(80);
