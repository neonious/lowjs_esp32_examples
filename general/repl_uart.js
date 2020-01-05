/*
 * Provides the Node.JS REPL (read-eval-print loop)
 * on the serial port most generic ESP32 boards have.
 *
 * Note: low.js commands run asyncronly! Try copying together
 *       two examples for more fun!
 */

'use strict';

let uart = require('uart');
let repl = require('repl');

let stream = new uart.UART({pinRX: 3, pinTX: 1, baud: 115200});
repl.start({input: stream, output: stream, terminal: true});
