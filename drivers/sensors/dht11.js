'use strict';

/*
 * A module to interface the DHT11 temperature + humidity module
 *
 * Should also work for DHT22, according to the Internet, you might have to divide
 * the results by 10 however.
 *
 *
 * *** HOW TO CONNECT ***
 *
 * VCC (pin 1)        connect to 3.3 V
 * Data (pin 2)       connect to any GPIO pin of neonious one, add 5K resistor to 3.3 V
 * GND (pin 4)        connect to GND
 * 
 * Pin 3 of DHT11/DHT22 is an unused pin.
 * 
 * NOTE: Currently you must use pin 25 or pin 26 of neonious one, as the LPC822 pins
 *       do not seem accurate enough for the DHT11 yet. We will fix this soon!
 *
 *
 * *** HOW TO USE ***
 *
 * const DHT11 = require('./dht11.js');
 * let sensor = new DHT11(7);
 * 
 * sensor.measure((err, temp, humidity) => {
 *     if(err)
 *         console.log(err);
 *     else {
 *         console.log('Temperature: ' + temp + '°C');
 *         console.log('Humidity: ' + humidity + ' %');
 *     }
 * });
 *
 */

const gpio = require('gpio');

class DHT11 {
    /*
     * constructor
     * Sets up pins
     */
    constructor(pinData) {
        this._pinData = pinData;

        this._riseCB = (v) => { this._rise(v); }
        this._fallCB = (v) => { this._fall(v); }
        gpio.pins[pinData].on('rise', this._riseCB);
        gpio.pins[pinData].on('fall', this._fallCB);
    }

    /*
     * close
     * Stops periodic measurement and resets pins
     */
    close() {
        this.stop();

        gpio.pins[this._pinData].setType(gpio.INPUT);
        gpio.pins[this._pinData].off('rise', this._riseCB);
        gpio.pins[this._pinData].off('fall', this._fallCB);
    }

    /*
     * measure
     * Measures the distance once and calls callback with the result
     *
     * callback(err, dist)
     * - err    an error if no distance could be measured
     * - dist   the distance in cm if err is null
     */
    measure(callback) {
        if(this._callback)
            throw new Error('already measuring');

        this._callback = callback;
        this._timeout = setTimeout(() => {
            delete this._callback;

            if(this._againMS !== undefined)
                setTimeout(() => {
                    this.measure(callback);
                }, this._againMS);
            callback(new Error('not connected'));
        }, 3000);
        delete this._riseStamp;

        this._n = 0;
        this._temp = this._hum = this._check = 0;

        gpio.pins[this._pinData].setValue(0);
        gpio.pins[this._pinData].setType(gpio.OUTPUT);
        setTimeout(() => {
            gpio.pins[this._pinData].setType(gpio.INPUT);
        }, 18);
    }

    /*
     * start
     * Starts a periodic measurement, calls callback with every new result
     *
     * callback(err, dist)
     * - err    an error if no distance could be measured (always retries)
     * - dist    the distance in cm if err is null
     * waitMS    time to wait between measurements (default: 1000 ms)
     *           check the datasheet for the minimum time between measurements
     *           (1000 ms for DHT11)
     */
    start(callback, waitMS) {
        if(this._callback)
            throw new Error('already measuring');

        this._againMS = waitMS === undefined ? 1000 : 0;
        this.measure(callback);
    }

    /*
     * stop
     * Stops periodic measurement, does not resets pins
     */
    stop() {
        delete this._againMS;
        if(this._callback) {
            delete this._callback;
            clearTimeout(this._timeout);
        }
    }

    _rise(stamp) {
        if(this._callback) {
            this._riseStamp = stamp;
        }
    }

    _fall(stamp) {
        if(this._callback && this._riseStamp !== undefined) {
            let dur = stamp - this._riseStamp;
            if(this._n != 0) {
                if(dur >= 0.015 && dur <= 0.035) {
                    if(this._n <= 16)
                        this._hum = this._hum << 1;
                    else if(this._n <= 32)
                        this._temp = this._temp << 1;
                    else
                        this._check = this._check << 1;
                }  else if(dur >= 0.06 && dur <= 0.08) {
                    if(this._n <= 16)
                        this._hum = (this._hum << 1) | 1;
                    else if(this._n <= 32)
                        this._temp = (this._temp << 1) | 1;
                    else
                        this._check = (this._check << 1) | 1;
                } else {
                    let cb = this._callback;

                    delete this._callback;
                    clearTimeout(this._timeout);

                    if(this._againMS !== undefined)
                        setTimeout(() => {
                            this.measure(cb);
                        }, this._againMS);
                    cb(new Error("wrong signal"));
                    return;
                }
            }
            delete this._riseStamp;

            this._n++;
            if(this._n == 41) {
                let cb = this._callback;

                delete this._callback;
                clearTimeout(this._timeout);

                if(this._againMS !== undefined)
                    setTimeout(() => {
                        this.measure(cb);
                    }, this._againMS);
                if((this._check & 0xFF) != (((this._hum >> 8) + this._hum + (this._temp >> 8) + this._temp) & 0xFF))
                    cb(new Error("wrong checksum"));
                else {
                    if(this._temp & 0x8000)
                        this._temp = -(this._temp & 0x7FFF);
                    if(this._hum & 0x8000)
                        this._hum = -(this._hum & 0x7FFF);
                    cb(null, this._temp / 256, this._hum / 256);
                }
            }
        }
    }
}

module.exports = DHT11;
