/*
 * neonious one example program
 *
 * Start hacking here !
 */

let http = require('http');
let fs = require('fs');
let gpio = require('gpio');

// Just thrown in to show how to detect a button press
// Note: This is for the left button, the right button is reset!
gpio.pins[gpio.BUTTON].on('fall', () => {
    console.log('Button pressed!')
});

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

        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
}

let ledRedState = false, ledGreenState = false;

http.createServer(function (req, res) {
    // Callbacks
    if (req.url == '/ToggleGreen') {
        res.end();
        console.log("Toggling green LED");
        ledGreenState = !ledGreenState;
        gpio.pins[gpio.LED_GREEN].setValue(ledGreenState);
    } else if (req.url == '/ToggleRed') {
        res.end();
        console.log("Toggling red LED");
        ledRedState = !ledRedState;
        gpio.pins[gpio.LED_RED].setValue(ledRedState);
    } else {
        writeStatic(req.url == '/' ? '/index.html' : req.url, res);
    }
}).listen(80);

console.log("Web server running!");
