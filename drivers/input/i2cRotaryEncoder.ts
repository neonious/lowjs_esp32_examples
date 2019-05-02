/*
 * A module to interface the i2c Encoder V2 (https://www.tindie.com/products/Saimon/i2cencoder-v2-connect-multiple-encoder-on-i2c-bus/)
 *
 * Written in TypeScript. Use tsc to convert it to js if needed.
 *
 * Currently only the illuminated rgb encoder is supported.
 *
 * *** HOW TO USE IT ***
 *
 * Connect VCC, GND
 * Connect SCL, SDA (Example Neonious Pin 20,21)
 * Connect INT (Example Neonious pin 8)
 *
 * Daisychain multiple encoders using different addresses, same interrupt pin.
 *
 * *** HOW TO USE ***
import {i2cRotaryEncoder, ic2RotaryEncoderEvent, myI2c} from "./i2cRotaryEncoder";

let gpio = require('gpio');
let I2c=new myI2c(20,21);
console.log('i2c setup complete');
let r=new i2cRotaryEncoder(gpio,I2c,48,8,(re: ic2RotaryEncoderEvent)=>{
    console.log(re);
    switch(re.event) {
        case r.INITIALIZED:
            // Example after initialization, set rgbcolor to red
            r.setRgb(255, 0, 0);
            break;
        case r.BTN_PUSH:
            console.log('Button pushed');
            break;
        case r.BTN_RELEASE:
            console.log('Button released');
            break;
        case r.ROTATED:
            console.log('Rotated, offset: '+re.value);
            break;
    }
});

 */

export interface ic2RotaryEncoderEvent {
    event: number,
    value: number
}
// Own i2c class with restart / recover function
export class myI2c {
    private readonly pinSCL;
    private readonly pinSDA;
    private i2cMod: any;
    private con: any;

    constructor(pinSCL: number, pinSDA ) {
        this.pinSCL=pinSCL;
        this.pinSDA=pinSDA;
        this.i2cMod = require('i2c');
        this.build();
    }
    build() {
        this.con=new this.i2cMod.I2C({
            pinSCL: this.pinSCL,
            pinSDA: this.pinSDA
        });
    }
    restart() {
        this.con.destroy();
        this.build();
    }
}
export class i2cRotaryEncoder {
    private gpio;
    private i2c;
    private readonly pinPWR: number;
    private readonly pinINT: number;
    private readonly i2cAddr: number;
    private readonly GCONF=0x00;
    private readonly CMAX=0x0c;
    private readonly INTCONF=0x04;
    private readonly ESTATUS=0x05;
    private readonly CVAL=0x08;
    private readonly R=0x18;
    private initialized=false;
    private lastpos: number=0;
    private readonly pollInt: any;

    public INITIALIZED=255;
    public BTN_PUSH=1;
    public BTN_RELEASE=2;
    public ROTATED=4;

    constructor(gpio: any, i2c: any,
                i2cAddr: number, pinINT: number, cb) {
        this.gpio=gpio;
        this.i2c=i2c;
        this.pinINT=pinINT;
        this.i2cAddr=i2cAddr;

        // Interrupt PIN
        this.gpio.pins[this.pinINT].setType(this.gpio.INPUT_PULLUP);
        this.gpio.pins[this.pinINT].on('fall', ()=> {
            if(this.initialized===true) {
                this.getStatus((re: ic2RotaryEncoderEvent) => {
                    cb(re);
                });
            }
        });
        // poll every 90 sec. to prevent lock on non recognised interrupt.
        this.pollInt=setInterval(()=>{
            if(this.initialized===true) {
                this.getStatus((re: ic2RotaryEncoderEvent) => {
                });
            }
        },90000);
        setTimeout(()=>{
            this.setupEncoder((re: boolean)=> {
                this.setCmax((re: boolean)=> {
                    this.setupInt((re: boolean)=>{
                        this.log('Init complete.');
                        this.initialized=true;
                        cb({event: this.INITIALIZED, value: 0});
                    });
                });
            });
        },2000);
    }
    log(txt: string): void {
        console.log('i2cRotEncV2: Addr: '+this.i2cAddr+': '+txt);
    }
    setupInt(cb) {
        let dataWrite = Buffer.alloc(2);
        dataWrite.writeUInt8(this.INTCONF, 0);
        dataWrite.writeUInt8(31, 1);

        this.i2c.con.transfer(this.i2cAddr, dataWrite, 0, (err, dataRead) => {
            if(err) {
                console.log("i2c error: ", err);
                setTimeout(()=>{
                    this.i2c.restart();
                    this.setupInt(cb);
                },1000);
            } else {
                this.log('Basic config done.');
                cb(true);
            }
        });
    }
    setCmax(cb) {
        let dataWrite = Buffer.alloc(5);
        dataWrite.writeUInt8(this.CMAX, 0);
        dataWrite.writeUInt8(0, 1);
        dataWrite.writeUInt8(0, 2);
        dataWrite.writeUInt8(0, 3);
        dataWrite.writeUInt8(100, 4);

        this.i2c.con.transfer(this.i2cAddr, dataWrite, 0, (err, dataRead) => {
            if(err) {
                console.log("i2c error: ", err);
                setTimeout(()=>{
                    this.i2c.restart();
                    this.setCmax(cb);
                },1000);
            } else {
                this.log('Max counter setup done.');
                cb(true);
            }
        });
    }
    setupEncoder(cb) {
        let dataWrite = Buffer.alloc(2);
        dataWrite.writeUInt8(this.GCONF, 0);
        dataWrite.writeUInt8(32+2, 1);

        this.i2c.con.transfer(this.i2cAddr, dataWrite, 0, (err, dataRead) => {
            if(err) {
                console.log("i2c error: ", err);
                setTimeout(()=>{
                    this.i2c.restart();
                    this.setupEncoder(cb);
                },1000);
            } else {
                this.log('Encoder setup done.');
                cb(true);
            }
        });
    }
    getRotaryPos(cb): void {
        let offset;
        let dataWrite = Buffer.alloc(1);
        dataWrite.writeUInt8(this.CVAL, 0);
        this.i2c.con.transfer(this.i2cAddr, dataWrite, 4, (err, dataRead) => {
            if(err) {
                console.log("i2c error: ", err);
                setTimeout(()=>{
                    this.i2c.restart();
                    this.getRotaryPos(cb);
                },1000);
            } else {
                if(dataRead.length === 4) {
                    offset = dataRead[3]-this.lastpos;
                    if(offset > 50) { offset = 1; }
                    if(offset < -50) { offset = -1; }

                    this.lastpos = dataRead[3];
                    cb({ event: this.ROTATED, value: offset});
                }
            }
        });
    }
    getStatus(cb): void {
        let dataWrite = Buffer.alloc(1);
        dataWrite.writeUInt8(this.ESTATUS, 0);
        this.i2c.con.transfer(this.i2cAddr, dataWrite, 1, (err, dataRead) => {
            if(err) {
                console.log("i2c error: ", err);
                setTimeout(()=>{
                    this.i2c.restart();
                    this.getStatus(cb);
                },1000);
            } else {
                // console.log(dataRead);
                if(dataRead[0] & 2) { // Push Button
                    cb({event: this.BTN_PUSH, value: 0});
                } else if(dataRead[0] & 1) {
                    cb({event: this.BTN_RELEASE, value: 0});
                } else if(dataRead[0] & 8 || dataRead[0] && 16) {
                    this.getRotaryPos((re: ic2RotaryEncoderEvent)=>{
                       cb(re);
                    });
                }
            }
        });
    }
    setRgb(r:number,g:number,b:number) {
        let dataWrite = Buffer.alloc(4);
        dataWrite.writeUInt8(this.R, 0);
        dataWrite.writeUInt8(r, 1);
        dataWrite.writeUInt8(g, 2);
        dataWrite.writeUInt8(b, 3);
        this.i2c.con.transfer(this.i2cAddr, dataWrite, 0, (err, dataRead) => {
            if(err) {
                console.log("i2c error: ", err);
                setTimeout(()=>{
                    this.i2c.restart();
                    this.setRgb(r,g,b);
                },1000);
            } else {
                this.log('RGB set to '+r+','+g+','+b);
            }
        });
    }
    destroy() {
        clearInterval(this.pollInt);
    }
}

