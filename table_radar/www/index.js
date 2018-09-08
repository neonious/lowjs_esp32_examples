"use strict";

// -----------------------------------------------------------------------------
//	tableradar - /www/index.js
//	Written by Thomas Rogg <thomas@neonious.com>, public domain
//
//	Example program for neonious one Technology Preview
//	More information: http://www.neonious.com/
//
//	This is not the main program file, but rather the JavaScript code
//	being sent to the user. It runs in the web browser, so we do not use
//	ES 6 features!
// -----------------------------------------------------------------------------

var canvas, ctx;
var canvasSize = [];

var request;					// the XMLHttpRequest
var lastDataPos, lastDataTime;	// for streaming

var lastAngle;

// This mapping from distance sensor voltage to distance in cm
// was done by testing. There most probably is an easier way to figure this
// out, but this works!
var distance = [];
distance[0.65] = 6;
distance[0.53] = 8;
distance[0.47] = 10;
distance[0.41] = 12;
distance[0.366] = 14;
distance[0.327] = 16;
distance[0.298] = 18;
distance[0.28] = 20;
distance[0.262] = 22;
distance[0.252] = 24;
/*distance[0.23] = 26;
distance[0.21] = 28;
distance[0.2] = 30;
distance[0.197] = 32;
distance[0.184] = 34;
distance[0.178] = 36;
distance[0.174] = 38;
distance[0.168] = 40;
distance[0.160] = 42;
distance[0.15] = 44;
*/

var maxCM = 24;

function volt2distance(volt) {
    var lower, upper;
    var lowerCM, upperCM;

    for(var distanceVolt in distance) {
        if(distanceVolt <= volt && (!lower || lower < distanceVolt)) {
            lower = distanceVolt;
            lowerCM = distance[distanceVolt];
        }
        if(distanceVolt >= volt && (!upper || upper > distanceVolt)) {
            upper = distanceVolt;
            upperCM = distance[distanceVolt];
        }
    }

    if(!lower)
        return upperCM / maxCM;
    if(!upper)
        return lowerCM / maxCM;

    var a = (volt - lower) / (upper - lower);
    return (upperCM * a + lowerCM * (1 - a)) / maxCM;
}

// Returns one line of data from the microcontroller (see /src/index.js)
function getData() {
    var time = new Date().getTime();

	// readyState 3 (did not recieve data fully) is what we need
	// readyState 4 means we are no longer streaming, so reconnect in this case
    if (!request || (request.readyState == 3 && request.status != 200) || request.readyState == 4 || time - lastDataTime > 30000) {
        lastDataTime = time;
        lastDataPos = 0;

        if (request)
            request.abort();
        request = new XMLHttpRequest();
        request.open("GET", "/DataStream");
        request.send();
    }
    if(request.readyState == 3) {
    	// Get the next line from responseText
        var pos = request.responseText.indexOf("\n", lastDataPos + 1);
        if (pos != -1) {
            var line = request.responseText.substring(lastDataPos, pos);

            lastDataTime = time;
            lastDataPos = pos;

            return line;
        }
    }
}

// Called every 30 ms
function step() {
	// Fade out current screen
    ctx.fillStyle = "rgb(0, 0, 0, 0.01)";
    ctx.fillRect(0, 0, canvasSize[0], canvasSize[1]);

    var x = canvasSize[0] / 2;
    var y = canvasSize[1];

	// Draw radar circles
    ctx.strokeStyle = "rgb(128, 255, 128)";
    ctx.lineWidth = 3;

    for(var i = 1; i < 5; i++) {
    	ctx.beginPath();
		ctx.arc(x, y, x * i / 5, 0, 2 * Math.PI);
		ctx.closePath();
		ctx.stroke();
    }

    ctx.strokeStyle = "rgb(255, 255, 255)";
    ctx.fillStyle = "rgb(0, 255, 0)";

	while(true) {
		// Get a new line of data (angle + distance) from microcontroller
		var line = getData();
		if (line)
			line = line.split(" ");
		if(!line || line.length != 2)
			return;	// we do not have any new data? return

		var a = parseFloat(line[0]);
        var v = parseFloat(line[1]);

		// Convert distance sensor voltage to distance
		var d = volt2distance(v);

		// Draw line showing in the direction we are looking
		ctx.beginPath();
		ctx.moveTo(x, y);
		ctx.lineTo(x + Math.cos(a) * x * 10, y - Math.sin(a) * x * 10);
		ctx.closePath();
		ctx.stroke();

		// 1.0 means we are at max distance, nothing there
		if(d < 1.0) {
			// Draw detected thing
			ctx.beginPath();
			ctx.arc(x + Math.cos(a) * x * d, y - Math.sin(a) * x * d, x * 0.03, 0, 2 * Math.PI);
			ctx.closePath();
			ctx.fill();
		}
    }
}

function onInit() {
	// Website entry point
    canvas = document.getElementById("view");
    ctx = canvas.getContext("2d");

    window.onresize = onResize;
    onResize();

    setInterval(step, 30);
}

function onResize() {
	// Our canvas should be as big as the window. No scaling!
    if (canvasSize[0] != canvas.offsetWidth
        || canvasSize[1] != canvas.offsetHeight) {
        canvasSize[0] = canvas.offsetWidth;
        canvasSize[1] = canvas.offsetHeight;

        canvas.width = canvasSize[0];
        canvas.height = canvasSize[1];

        ctx.fillStyle = "rgb(0, 0, 0, 1)";
        ctx.fillRect(0, 0, canvasSize[0], canvasSize[1]);
    }
}