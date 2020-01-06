/*
 * Animates the RGB LEDs on the back of the ESP-WROVER-KIT
 * from red -> green -> blue -> red
 *
 * Note: low.js commands run asyncronly! Try copying together
 *       two examples for more fun!
 */

'use strict';

let gpio = require('gpio');

const FRAME_MS = 30;
const FRAME_DIST = 1 / FRAME_MS;

gpio.setFrequency(60);
gpio.pins[0].setType(gpio.OUTPUT);  // red
gpio.pins[2].setType(gpio.OUTPUT);  // green
gpio.pins[4].setType(gpio.OUTPUT);  // blue

let at = 0;
let dist = 0;

function animate() {
  while (true) {
    dist += FRAME_DIST;
    if (dist <= 1) break;

    gpio.pins[at * 2].setValue(0);

    dist -= 1;
    at = (at + 1) % 3;
  }

  gpio.pins[at * 2].setValue(1 - dist);
  gpio.pins[((at + 1) % 3) * 2].setValue(dist);
}
setInterval(animate, FRAME_MS);