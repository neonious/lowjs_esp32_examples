/*
 * can_self_test.js
 * 
 * Simple example program which tests whether the CAN transceiver
 * is wired correctly by sending a message and receiving it itself.
 * 
 * When it will fail:
 * - CAN transceiver does not report own messages on RX pin
 * - No resistor between CAN high and low, so bus cannot
 *   go back into CAN high == CAN low state
 */

// Pins to use. Must be ESP32 native pins
const PIN_RX = 26;		// use 24-26 on neonious one
const PIN_TX = 25;		// use 24-25 on neonious one

// ID to use
const MY_ID = 123;
const MY_ID_LEN = 11;	// 11 or 29

// Setup CAN peripherial
let can = require('can');
let intf = new can.CAN({
    mode: can.MODE_NO_ACK,		// do not wait for ACK
    pinRX: PIN_RX,
    pinTX: PIN_TX,
    filter: {id: MY_ID, id_len: MY_ID_LEN}
});

// Handle everything which can go wrong
let timer = setTimeout(() => {
    failed('timed out');
}, 5000);

function failed(e) {
    if(timer) {
        clearTimeout(timer);
        timer = null;
    }
    intf.unref();	// make program exit

    console.log('Failed: ', e);
}

intf.on('error', (e) => {
    console.log('error: ' + e);
});
intf.on('rxMissed', () => {
    console.log('rx queue full');
});
intf.on('arbLost', () => {
    console.log('arbitration lost, should only happen with one shot messages');
});
intf.on('stateChanged', () => {
    if(intf.state == can.STATE_ERR_PASSIVE)
        failed('state changed to passive');
    else if(intf.state == can.STATE_BUS_OFF)
        failed('state changed to bus-off. You have to call intf.recover()');
});

intf.on('message', (data, id, id_len, flags) => {
    if(data.toString() == 'hello!' && id == MY_ID && id_len == MY_ID_LEN) {
        // We have the message
        if(timer) {
            clearTimeout(timer);
            timer = null;
        }
        intf.unref();	// make program exit

        console.log('Success, sent and received messsage!');
    } else
        failed('message received is different than sent')
});

// Send a message
intf.trasmit(Buffer.from("hello!"), MY_ID, MY_ID_LEN, can.RECV_SELF);
