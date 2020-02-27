/*
 * uart_loop.js
 * 
 * This program demonstrates the ability to communicate via UART
 * and the ability of to connect pins internally to a loop back.
 * It writes "Hello world!" via one UART and reads it via another
 * UART from the same pin.
 */

let uart = require('uart');

let pipeIn = new uart.UART({
    pinRX: 14,
    pinTX: 13
});
// Pipe out must be created after pipe in, because creating
// pipe in later would set the pin mode wrong. Nothing to worry
// about in real life, as nobody would use UART to simply loop
// back on one pin...
let pipeOut = new uart.UART({
    pinRX: 13,
    pinTX: 14
});

pipeOut.setEncoding('utf8');
pipeIn.setEncoding('utf8');

let txt = '';
pipeIn.on('data', (chunk) => {
    txt += chunk;
});

pipeOut.write('Hello world!');
setTimeout(() => {
    console.log(txt);

    // Close application
    pipeIn.destroy();
    pipeOut.destroy();
}, 1000);
