/*
 * tmcm-3212-tmcl.js
 * 
 * A class to interface a TMCM-3212 via CAN
 * 
 * Implements all things needed for direct mode
 * Multiple objects can be used to interface multiple devices at the same time
 * 
 * This class has several special features:
 * - It supports both callbacks and async/await out of the box
 * - Move to position and reference search call the callback when the action is done completly,
 *   not when the command is replied to.
 *   This is implemented by waiting till the request target position event happens.
 * - The motors can be accessed at the same time, even a reference search can happen on all axis
 *   simultaneously, the callbacks will still not be mixed up.
 * 
 * Example on how to use:
 * 
 * let tmcm3213 = require('./tmcm-3212-tmcl.js');
 * 
 * // Pins to use. Must be ESP32 native pins
 * const PIN_RX = 26;		// use 24-26 on neonious one
 * const PIN_TX = 25;		// use 24-25 on neonious one
 * 
 * const DEVICE_ID = 1;    // in real life we can use multiple devices
 * const MY_ID = 2;        // the device the TMCM-3212 replies to
 * 
 * // Setup CAN peripherial
 * let can = require('can');
 * let intf = new can.CAN({
 *     pinRX: PIN_RX,
 *     pinTX: PIN_TX,
 * 	filter: {id: MY_ID, id_len: 11}
 * });
 * 
 * // Communicate with device
 * let device = new tmcm3213.TMCM3212(intf, DEVICE_ID, MY_ID);
 * 
 * async function asyncExample() {
 *     // Reference search mode: 65 instead of 1 => turn right, not left
 *     // See https://www.trinamic.com/fileadmin/assets/Products/Modules_Documents/TMCM-3212_TMCL-firmware_manual_Fw1.09_Rev1.05.pdf
 *     // for parameter details
 *     await device.setAxisParameter(0, 193, 65);
 * 
 *     // Do reference search
 *     await device.referenceSearch(0);
 * 
 *     // Move away from reference
 *     await device.moveToPositionRel(0, 50000);
 * 
 *     // Back and forth
 *     while(true) {
 *         await device.moveToPositionRel(0, -20000);
 *         await device.moveToPositionRel(0, 20000);
 *     }
 * }
 * 
 * asyncExample();
 * 
 * --- end of example ---
 */

"use strict";

class TMCM3212 {
    /*
     * constructor
     */
    constructor(can, deviceID, replyID) {
        this._can = can;
        this._deviceID = deviceID;
        this._replyID = replyID;

        // The commands we are waiting to be answered
        this._commands = {};
        this._commandsQueue = {};

        // Handle incoming message
        can.on('message', (data, id, id_len, flags) => {
            // Is this a reply for us?
            if(data.length == 7 && id == this._replyID && id_len == 11) {
                let device = data.readUInt8(0);
                let status = data.readUInt8(1);
                let command = data.readUInt8(2);

                if(status == 128 && command == 138) {
                    // Special case: reached target position
                    let motorMask = data.readUInt8(6);

                    for(let i = 0; i < 3; i++) {
                        // Reinterpret it as command reply for move position
                        let callback = this._commands[((i + 1) << 16) | (device << 8) | 4];
                        if((motorMask & (1 << i)) && callback)
                            callback(null);

                        // Same for reference search, but as reached target position
                        // happens multiple times for reference search (seems to be implemented
                        // as multiple move positions internally) we check whether the full reference
                        // is done
                        callback = this._commands[((i + 1) << 16) | (device << 8) | 13];
                        if((motorMask & (1 << i)) && callback) {
                            this.transmit(13, 2, i, 0, (err, value) => {
                                callback = this._commands[((i + 1) << 16) | (device << 8) | 13];
                                if(!err && value == 0 && callback) {
                                    // We are completly done!
                                    callback(null);
                                }
                            });
                        }
                    }

                    return;
                }

                // Call callback
                let callback = this._commands[(device << 8) | command];
                if(!callback)
                    return;

                let err;
                switch(status) {
                case 100:
                    err = null;
                    break;

                case 101:
                    err = new Error('command loaded into EEPROM, but we currently only do direct mode');
                    break;

                case 1:
                    err = new Error('wrong checksum');
                    break;

                case 2:
                    err = new Error('invalid command');
                    break;

                case 3:
                    err = new Error('wrong type');
                    break;

                case 4:
                    err = new Error('invalid value');
                    break;

                case 5:
                    err = new Error('configuration EEPROM locked');
                    break;

                case 6:
                    err = new Error('configuration EEPROM locked');
                    break;

                default:
                    err = new Error('unknown TMCL status code ' + status);
                    break;
                }

                callback(err, err ? undefined : data.readUInt32BE(3));
            }
        });

        // Tell device that we want to get info about target position reached
        this.transmit(138, 1, 0, 255);
    }

    /*
     * transmit
     * Sends a TCML command for direct execution, waits asyncronly for a reply
     * and calls the callback with the result. If no callback is given, it returns
     * a promise.
     * No need to use directly, take a look at the specialised commands below.
     */
    transmit(command, type, motorBank, value, callback) {
        if(!callback) {
            return new Promise((resolve, reject) => {
                this.transmit(command, type, motorBank, value, (err, value) => {
                    if(err)
                        reject(err);
                    else
                        resolve(value);
                });
            })
        }

        let index = (this._deviceID << 8) | command;
        if(command == 4 || (command == 13 && type == 0))
            index |= (motorBank + 1) << 16;

        if(this._commands[index]) {
            if(this._commandsQueue[index])
                this._commandsQueue[index].push([motorBank, value, callback]);
            else
                this._commandsQueue[index] = [[motorBank, value, callback]];
            return;
        }

        let timeout;

        // The first thing that calls this callback wins, be it a
        // reply (see on('message', ...) above), an transmit error or a timeout
        let doneCallback = (err, value) => {
            if(!doneCallback)
                return;
            doneCallback = null;

            if(timeout)
                clearTimeout(timeout);
            delete this._commands[index];
            if(this._commandsQueue[index] && this._commandsQueue[index].length) {
                let commandParams = this._commandsQueue[index].shift();
                this.transmit(command, type, commandParams[0], commandParams[1], commandParams[2]);
            }

            if(callback)
                callback(err, value);
            else if(err)
                can.emit('error', err);
        }

        // Handle timeout
        timeout = setTimeout(() => {
            timeout = null;
            if(doneCallback)
                doneCallback(new Error('timeout ' + type + '/' + command + '/' + motorBank));
        }, command == 4 || (command == 13 && type == 0) ? 300000 : 5000);

        // Transmit
        this._commands[index] = doneCallback;

        let data = Buffer.alloc(7);
        data.writeUInt8(command, 0);
        data.writeUInt8(type, 1);
        data.writeUInt8(motorBank, 2);
        data.writeUInt32BE(value, 3);

        this._can.transmit(data, this._deviceID, 11, (err) => {
            // Sent! Only call callback now if we have an error
            if(err && doneCallback)
                doneCallback(err);
        });
    }

    /**************/
    // Commands according to https://www.trinamic.com/fileadmin/assets/Products/Modules_Documents/TMCM-3212_TMCL-firmware_manual_Fw1.09_Rev1.05.pdf
    // If no callback is given, these return promises which can be used with await
    /**************/

    rotateRight(motor, microstepsPerSecond, callback) {
        return this.transmit(1, 0, motor, microstepsPerSecond, callback);
    }
    rotateLeft(motor, microstepsPerSecond, callback) {
        return this.transmit(2, 0, motor, microstepsPerSecond, callback);
    }
    motorStop(motor, callback) {
        return this.transmit(3, 0, motor, 0, callback);
    }

    // Not only than the simple command, this call actually calls callback/resolves the promise when
    // the reference search is done completly
    moveToPositionAbs(motor, position, callback) {
        return this.transmit(4, 0, motor, position, callback);
    }

    // Not only than the simple command, this call actually calls callback/resolves the promise when
    // the reference search is done completly
    moveToPositionRel(motor, offset, callback) {
        return this.transmit(4, 1, motor, offset, callback);
    }

    setAxisParameter(motor, type, value, callback) {
        return this.transmit(5, type, motor, value, callback);
    }
    getAxisParameter(motor, type, callback) {
        return this.transmit(6, type, motor, 0, callback);
    }

    // bank 0 is always used, as other banks are not needed for direct mode
    setGlobalParameter(type, value, callback) {
        return this.transmit(9, type, 0, value, callback);
    }

    // bank 0 is always used, as other banks are not needed for direct mode
    getGlobalParameter(type, callback) {
        return this.transmit(10, type, 0, 0, callback);
    }

    // other than the simple command, this call actually calls callback/resolves the promise when
    // the reference search is done completly
    referenceSearch(motor, callback) {
        return this.transmit(13, 0, motor, 0, callback);
    }

    // bank must be 2 (digital outputs)
    // If port is null, sets all at once
    setGPIOLevel(port, bank, level, callback) {
        return this.transmit(14, port === null ? 255 : port, bank, level, callback);
    }

    // bank 0: digital inputs
    // bank 1: analog inputs (value between 0 and 2^16-1/65535)
    // bank 2: digital outputs
    // If port is null on digital, returns a bit vector of all
    // To query the state of the ENABLE input, use port=10, bank=0
    getGPIOLevel(port, bank, callback) {
        return this.transmit(15, port === null ? 255 : port, bank, 0, callback);
    }
}

exports.TMCM3212 = TMCM3212;