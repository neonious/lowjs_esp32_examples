/*
 * A module to interface the HC-SR04 distance sensor module
 * 
 * The HC-SR04 is an ultrasonic distance sensor module which measures distances between
 * 2 and ~300 cm. It is available from many vendors at a price from $ 1 up.
 *
 * TODO: make periodic measurement faster by using PWM instead of manually retriggering
 *
 *
 * *** HOW TO CONNECT ***
 *
 * The device is 5 V only, but as it accepts a 3.3 V signal in we can still connect
 * it directly to the neonious one:
 *
 * GND		connect to GND
 * VCC		connect to 5 V (VIN of neonious one if powered to USB)
 * Trigger	connect to any GPIO pin
 * Echo		connect to 5 V tolerate pin (4 and 5 on neonious one)
 *
 * Do not connect Echo to any other pin directly as the other pins do not tolerate 5 V.
 * If you do not have a 5 V tolerate pin available you will have to shift the voltage.
 *
 *
 * *** HOW TO USE ***
 *
 * const HC_SR04 = require('./hc_sr04.js');
 *
 * let sensor = new HC_SR04(11,     // pinTrigger
 *                          4);     // pinEcho
 * sensor.measure((err, dist) => {
 *     if(err)
 *         console.log(err);
 *     else
 *         console.log('Distance: ' + dist + ' cm');
 * });
 *
 */

const gpio = require('gpio');

class HC_SR04 {
	/*
	 * constructor
	 * Sets up pins
	 */
    constructor(pinTrigger, pinEcho) {
        this._pinTrigger = pinTrigger;
        this._pinEcho = pinEcho;

        gpio.pins[pinTrigger].setType(gpio.OUTPUT);
        gpio.pins[pinTrigger].setValue(0);

        gpio.pins[pinEcho].setType(gpio.INPUT);

        this._riseCB = (v) => { this._rise(v); }
        this._fallCB = (v) => { this._fall(v); }
        gpio.pins[pinEcho].on('rise', this._riseCB);
        gpio.pins[pinEcho].on('fall', this._fallCB);
    }

	/*
	 * close
	 * Stops periodic measurement and resets pins
	 */
    close() {
    	this.stop();

        gpio.pins[this._pinTrigger].setType(gpio.INPUT);
        gpio.pins[this._pinEcho].off('rise', this._riseCB);
        gpio.pins[this._pinEcho].off('fall', this._fallCB);
    }

	/*
	 * measure
	 * Measures the distance once and calls callback with the result
	 *
	 * callback(err, dist)
	 * - err	an error if no distance could be measured
	 * - dist	the distance in cm if err is null
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
        }, 1000);
        delete this._riseStamp;

        gpio.pins[this._pinTrigger].setValue(1);
        gpio.pins[this._pinTrigger].setValue(0);
    }

	/*
	 * start
	 * Starts a periodic measurement, calls callback with every new result
	 *
	 * callback(err, dist)
	 * - err	an error if no distance could be measured (always retries)
	 * - dist	the distance in cm if err is null
	 * waitMS	time to wait between measurements
	 */
	start(callback, waitMS) {
        if(this._callback)
            throw new Error('already measuring');

        this._againMS = waitMS === undefined ? 200 : 0;
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

            clearTimeout(this._timeout);
            this._timeout = setTimeout(() => {
                let cb = this._callback;
                delete this._callback;

                if(this._againMS !== undefined)
                    setTimeout(() => {
                        this.measure(cb);
                    }, this._againMS);
                cb(new Error('echo still high, not connected correctly?'));
            }, 1000);
        }
    }

    _fall(stamp) {
        if(this._riseStamp && this._callback) {
            let cb = this._callback;
            // Sound velocity 34.2 cm / ms at 20°C
            let val = 34.2 / 2 * (stamp - this._riseStamp);

            delete this._callback;
            clearTimeout(this._timeout);

			if(this._againMS !== undefined)
                setTimeout(() => {
    				this.measure(cb);
                }, this._againMS);
            cb(null, val);
        }
    }
}

module.exports = HC_SR04;