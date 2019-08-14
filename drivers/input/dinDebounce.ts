
/*
 * A module to debounce digital input
 *
 * Written in TypeScript. Use tsc to convert it to js if needed:
 *
 * npm install -g typescript // installs typescript
 * tsc dinDebounce.ts // generates dinDebounce.js
 *
 **** HOW TO USE IT ***
 let gpio = require('gpio');
 
 import { dinDebounce } from "./dinDebounce";
 
 // Arguments: PIN Number, Debouncevalue in ms, pass through reference, callback function

 let myinput=new dinDebounce(27,gpio.INPUT,200,'Switch1',(pinValue,ref)=> {
    console.log('New debounced pin state for '+ref+': '+pinValue);
 });
 
 */
class dinDebounce {
    private gpio: any;
    private pin: number;
    private pinState: number;
    private db: number;
    private cb: any;
    private int: any = undefined;
    private ref: any;

    constructor(pin: number, mode: number, db: number, ref:any, cb: any) {
        this.gpio = require('gpio');

        this.pin = pin;
        this.db = db;
        this.cb = cb;
        this.ref = ref;

        this.gpio.pins[pin].setType(mode);

        this.gpio.pins[pin].on('rise', () => {
            if(this.db===0) {
                this.cb(this.ref,1);
            } else {
                this.debounce(1);
            }
        });
        this.gpio.pins[pin].on('fall', () => {
            if(this.db===0) {
                this.cb(this.ref,0);
            } else {
                this.debounce(0);
            }
        });
    }
    debounce(pinState: number): void {
        this.pinState=pinState;
        if(this.int===undefined) {
            this.int=setTimeout(()=> {
                this.int=undefined;
                this.cb(this.ref,this.pinState);
            },this.db);
        }
    }
}
