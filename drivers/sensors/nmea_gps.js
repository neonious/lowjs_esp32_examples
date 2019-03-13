/*
 * A module to interface GPS devices which support NMEA sentences, a standard which
 * almost any GPS module does. Gives out all interesting information and sets system clock.
 * 
 * If you are unsure which device to choose, we can recommend the u-blox NEO-6M.
 *
 *
 * *** HOW TO CONNECT ***
 *
 * GND        connect to GND
 * VCC        connect to 3.3 V
 * TX         connect to any pin of the neonious one, as all support GPIO input
 *
 *
 * *** HOW TO USE ***
 *
 * const NMEA_GPS = require('./nmea_gps.js');
 * 
 * let sensor = new NMEA_GPS({
 *     setSystemTime: true,            // sets system time to GPS time
 *     pinRX: 11,                      // pinTX (RX at neonious one)
 *     baud: 9600});                   // baud rate (try 9600 or look into datasheet)
 *     // also, add other options for UART module if needed
 * // when done, call sensor.destroy();
 * 
 * sensor.on('gps', (time, pos, speed, height, quality, numSatellites) => {
 *     if(time !== null)
 *         console.log('Time:         ', time);     // time is a Date or null
 *     if(pos !== null)                             // pos.lat and pos.lon are numbers or null
 *         console.log('Position:     ', NMEA_GPS.lat2txt(pos.lat), NMEA_GPS.lon2txt(pos.lon));
 *     if(height !== null)                          // height is number or null
 *         console.log('Height:       ', height, ' m above sea level');
 *     if(speed !== null)                           // speed is number or null
 *         console.log('Speed:        ', speed, ' km/h over ground');
 * 
 *     // quality is integer, see quality2txt
 *     console.log('Quality:      ', NMEA_GPS.quality2txt(quality));
 *     // numSatellites is integer
 *     console.log('# Satellites: ', numSatellites);
 * });
 * sensor.on('no-nmea', () => {
 *     console.log('Timeout, please check connection to module')
 * });
 * 
 */

const uart = require('uart');
const readline = require('readline');
const lowsys = require('lowsys');

class NMEA_GPS extends uart.UART {
    /*
     * constructor
     */
    constructor(options) {
        super(options);

        this.current = {
            time: null,
            pos: null,
            speed: null,
            height: null,
            quality: 0,
            numSatellites: 0
        };
        this._setSystemTime = options ? !!options.setSystemTime : false;

        this._noNMEATimeout = setTimeout(() => {
            this.emit('no-nmea');
        }, 10000);

        let iface = readline.createInterface({input: this});
        iface.on('error', (e) => { this.emit('error', e); });
        iface.on('line', this._handleLine.bind(this));

        this.on('close', () => {
            clearTimeout(this._noNMEATimeout);
            iface.close();
        });
    }

    _handleLine(line) {
        if(line[0] != '$')
            return;

        // Check checksum
        let pos = line.indexOf('*');
        if(pos == -1)
            return;
        let checkSum;
        for(let i = 1; i < pos; i++)
            checkSum ^= line.charCodeAt(i);
        if(checkSum != parseInt(line.substr(pos + 1), 16))
            return;

        this._noNMEATimeout.refresh();

        let current;

        line = line.split(',');
        if(line[0] == '$GPGGA') {
            current = Object.assign({}, this.current);

            if(line[2] && line[4]) {
                let val;

                val = line[2];
                let lat = (val * 0.01) | 0;
                lat += (val - lat * 100) / 60;
                if(line[3] != 'N')
                    lat = -lat;

                val = line[4];
                let lon = (val * 0.01) | 0;
                lon += (val - lon * 100) / 60;
                if(line[5] != 'E')
                    lon = -lon;

                current.pos = {lat, lon};
            } else
                current.pos = null;
            current.height = line[9] !== '' ? line[9] * 1 : null;

            current.quality = line[6] | 0;
            current.numSatellites = line[7] | 0;

            if(this.current.pos != current.pos && (!this.current.pos || !current.pos
                || this.current.pos.lat != current.pos.lat || this.current.pos.lon != current.pos.lon)
            || this.current.height != current.height
            || this.current.quality != current.quality
            || this.current.numSatellites != current.numSatellites) {
                this.current = current;
                this.emit('gps',
                    current.time,
                    current.pos,
                    current.speed,
                    current.height,
                    current.quality,
                    current.numSatellites);
            }
        }
        if(line[0] == '$GPRMC') {
            current = Object.assign({}, this.current);

            let time = line[1];
            let date = line[9];
            if(time !== '' && date !== '') {
                let secs = parseFloat(time.substr(4));
                current.time = new Date(Date.UTC(
                    2000 + (date.substr(4, 2) | 0),
                    (date.substr(2, 2) | 0) - 1,
                    date.substr(0, 2) | 0,
                    time.substr(0, 2) | 0,
                    time.substr(2, 2) | 0,
                    secs | 0,
                    (secs - (secs | 0)) * 1000
                ));

                if(this._setSystemTime) {
                    let diff = current.time.getTime() - new Date().getTime();
                    // Only change if more than 10s deviation to not break
                    // any timing loops in the user program
                    if(!this._firstSet || diff < -10000 || diff > 10000) {
                        lowsys.setSystemTime(current.time);
                        this._firstSet = true;
                    }
                }
            } else
                current.time = null;
            if(line[3] && line[5]) {
                let val;

                val = line[3];
                let lat = (val * 0.01) | 0;
                lat += (val - lat * 100) / 60;
                if(line[4] != 'N')
                    lat = -lat;

                val = line[5];
                let lon = (val * 0.01) | 0;
                lon += (val - lon * 100) / 60;
                if(line[6] != 'E')
                    lon = -lon;

                current.pos = {lat, lon};
            } else
                current.pos = null;

            current.speed = line[7] !== '' ? line[7] * 1.852 : null;
    
            if(this.current.time != current.time && (!this.current.time || !current.time
                || this.current.time.getTime() != current.time.getTime())
            || this.current.pos != current.pos && (!this.current.pos || !current.pos
                || this.current.pos.lat != current.pos.lat || this.current.pos.lon != current.pos.lon)
            || this.current.speed != current.speed) {
                this.current = current;
                this.emit('gps',
                    current.time,
                    current.pos,
                    current.speed,
                    current.height,
                    current.quality,
                    current.numSatellites);
            }
        }
    }
}

module.exports = NMEA_GPS;

module.exports.lat2txt = function(val) {
    if(val === null)
        return '-';

    let unit;
    if(val < 0) {
        unit = 'S';
        val = -val;
    } else
        unit = 'N';

    val = ((val * 36000) + 0.5) | 0;

    let part1 = (val / 36000) | 0;
    val -=  part1 * 36000;
    let part2 = (val / 600) | 0;
    val -= part2 * 600;
    let part3 = (val / 10) | 0;
    let part4 = val - part3 * 10;

    txt = part1 + '°';
    if(part2 || part3 || part4) {
        txt += part2 + "'";
        if(part3 || part4) {
            txt += part3;
            if(part4)
                txt += '.' + part4;
            txt += '"';
        }
    }

    return txt + unit;
}

module.exports.lon2txt = function(val) {
    if(val === null)
        return '-';

    let unit;
    if(val < 0) {
        unit = 'W';
        val = -val;
    } else
        unit = 'E';

    val = ((val * 36000) + 0.5) | 0;

    let part1 = (val / 36000) | 0;
    val -=  part1 * 36000;
    let part2 = (val / 600) | 0;
    val -= part2 * 600;
    let part3 = (val / 10) | 0;
    let part4 = val - part3 * 10;

    txt = part1 + '°';
    if(part2 || part3 || part4) {
        txt += part2 + "'";
        if(part3 || part4) {
            txt += part3;
            if(part4)
                txt += '.' + part4;
            txt += '"';
        }
    }

    return txt + unit;
}

module.exports.quality2txt = function(quality) {
    switch(quality) {
    case 0: return 'no fix';
    case 1: return 'GPS';
    case 2: return 'Differential GPS';

    case 3:
    case 4:
        return 'Real-Time Kinematic';
    }

    return 'unknown';
}