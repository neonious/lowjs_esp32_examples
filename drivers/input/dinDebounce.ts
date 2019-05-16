
/*
 * A module to debounce digital input
 *
 * Written in TypeScript. Use tsc to convert it to js if needed.
 *
 **** HOW TO USE IT ***
 let gpio = require('gpio');
 
 import { dinDebounce } from "./dinDebounce";
 
 // Argument: PIN Number, Debouncevalue in ms, callback function

 let myinput=new dinDebounce(27,gpio.INPUT,200,(pinValue)=> {
    console.log('New debounced pin state: '+pinValue);
 });
 
 */

export class dinDebounce {
    private gpio: any;
    private pin: number;
    private pinState: number;
    private db: number;
    private cb: any;
    private int: any = undefined;

    constructor(pin: number, mode: number, db: number, cb: any) {
        this.gpio = require('gpio');

        this.pin = pin;
        this.db = db;
        this.cb = cb;

        this.gpio.pins[pin].setType(mode);

        this.gpio.pins[pin].on('rise', () => {
            this.debounce(0);
        });
        this.gpio.pins[pin].on('fall', () => {
            this.debounce(1);
        });

    }
    debounce(pinState: number): void {
        this.pinState=pinState;
        if(this.int===undefined) {
            this.int=setTimeout(()=> {
                this.int=undefined;
                this.cb(this.pinState);
            },this.db);
        }
    }
}
