/*
 * uart_loop.js
 * 
 * This program demonstrates the ability to communicate via UART
 * and the ability of to connect pins internally to a loop back.
 * It writes "Hello world!" via one UART and reads it via another
 * UART from the same pin.
 */

let uart = require('uart');

let pipe1 = new uart.UART({
    pinRX: 13,
    pinTX: 14
});
let pipe2 = new uart.UART({
    pinRX: 14,
    pinTX: 13
});

pipe1.setEncoding('utf8');
pipe2.setEncoding('utf8');

let txt = '';
pipe2.on('data', (chunk) => {
    txt += chunk;
});

pipe1.write('Hello world!');
setTimeout(() => {
    console.log(txt);

    // Close application
    pipe1.destroy();
    pipe2.destroy();
}, 1000);