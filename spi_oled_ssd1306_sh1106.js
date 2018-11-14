/*
 * oled_ssd1306_sh1106.js
 * 
 * This program shows how to interface an OLED display with the ssd1306 or sh1106
 * driver chip via SPI
 * 
 * Note: SPI is still slow on the neonious one, as the link to the LPC822
 *       is not fast. But this will be fixed very soon.
 */

// **** IMPORTANT ****
// In case this is not a ssd1306 but a sh1106, the left most pixel is sometimes
// the pixel with the x coordinate 2 (everything shifted by 2 pixels)
// Try to set this to 2, if the display has some uninitialized lines left
const SSHD1306_COLUMN_OFFSET = 0;

let spi = require('spi');
let gpio = require('gpio');

// Commands
const SSD1306_SETCONTRAST = 0x81;
const SSD1306_DISPLAYALLON_RESUME = 0xA4;
const SSD1306_DISPLAYALLON = 0xA5;
const SSD1306_NORMALDISPLAY = 0xA6;
const SSD1306_INVERTDISPLAY = 0xA7;
const SSD1306_DISPLAYOFF = 0xAE;
const SSD1306_DISPLAYON = 0xAF;
const SSD1306_SETDISPLAYOFFSET = 0xD3;
const SSD1306_SETCOMPINS = 0xDA;
const SSD1306_SETVCOMDETECT = 0xDB;
const SSD1306_SETDISPLAYCLOCKDIV = 0xD5;
const SSD1306_SETPRECHARGE = 0xD9;
const SSD1306_SETMULTIPLEX = 0xA8;
const SSD1306_SETLOWCOLUMN = 0x00;
const SSD1306_SETHIGHCOLUMN = 0x10;
const SSD1306_SETSTARTLINE = 0x40;
const SSD1306_MEMORYMODE = 0x20;
const SSD1306_COMSCANINC = 0xC0;
const SSD1306_COMSCANDEC = 0xC8;
const SSD1306_SEGREMAP = 0xA0;
const SSD1306_SETPAGEADDRESS = 0xB0;
const SSD1306_CHARGEPUMP = 0x8D;
const SSD1306_EXTERNALVCC = 0x1;
const SSD1306_INTERNALVCC = 0x2;
const SSD1306_SWITCHCAPVCC = 0x2;

const SSD1306_VCCSTATE = SSD1306_INTERNALVCC;

class OLEDDisplay {
    constructor(spi, options) {
    	this.spi = spi;
        this.width = options.width;
        this.height = options.height;
        this.buffer = new Buffer(this.width * this.height / 8);
        this.pinDC = options.pinDC;
        this.pinCS = options.pinCS;

        gpio.pins[options.pinDC].setType(gpio.OUTPUT);
        gpio.pins[options.pinDC].setValue(0);
        if (options.pinRES) {
            gpio.pins[options.pinRES].setType(gpio.OUTPUT);
            gpio.pins[options.pinRES].setValue(0);
            gpio.pins[options.pinRES].setValue(1);
        }

        let buf = Buffer(128);
        let bufPos = 0;
        function spi_byte(byte) {
            buf[bufPos++] = byte;
        }

        if (this.width == 64 && this.height == 48) {
            // Init sequence taken from SFE_MicroOLED.cpp
            spi_byte(SSD1306_DISPLAYOFF);         // 0xAE
            spi_byte(SSD1306_SETDISPLAYCLOCKDIV); // 0xD5
            spi_byte(0x80);                       // the suggested ratio 0x80
            spi_byte(SSD1306_SETMULTIPLEX);       // 0xA8
            spi_byte(DISPLAY_HEIGHT - 1);
            spi_byte(SSD1306_SETDISPLAYOFFSET);   // 0xD3
            spi_byte(0x0);                        // no offset
            spi_byte(SSD1306_SETSTARTLINE | 0x0); // line #0
            spi_byte(SSD1306_CHARGEPUMP);         // enable charge pump
            spi_byte(0x14);
            spi_byte(SSD1306_NORMALDISPLAY);       // 0xA6
            spi_byte(SSD1306_DISPLAYALLON_RESUME); // 0xA4
            spi_byte(SSD1306_SEGREMAP | 0x1);
            spi_byte(SSD1306_COMSCANDEC);
            spi_byte(SSD1306_SETCOMPINS); // 0xDA
            spi_byte(0x12);
            spi_byte(SSD1306_SETCONTRAST); // 0x81
            spi_byte(0x8F);
            spi_byte(SSD1306_SETPRECHARGE); // 0xd9
            spi_byte(0xF1);
            spi_byte(SSD1306_SETVCOMDETECT); // 0xDB
            spi_byte(0x40);
        } else if (this.width == 128 && this.height == 32) {
            // Init sequence taken from datasheet for UG-2832HSWEG04 (128x32 OLED module)
            spi_byte(SSD1306_DISPLAYOFF);         // 0xAE
            spi_byte(SSD1306_SETDISPLAYCLOCKDIV); // 0xD5
            spi_byte(0x80);                       // the suggested ratio 0x80
            spi_byte(SSD1306_SETMULTIPLEX);       // 0xA8
            spi_byte(DISPLAY_HEIGHT - 1);
            spi_byte(SSD1306_SETDISPLAYOFFSET);   // 0xD3
            spi_byte(0x0);                        // no offset
            spi_byte(SSD1306_SETSTARTLINE | 0x0); // line #0
            spi_byte(SSD1306_CHARGEPUMP);         // 0x8D
            if (SSD1306_VCCSTATE == SSD1306_EXTERNALVCC)
                spi_byte(0x10);
            else
                spi_byte(0x14);
            spi_byte(SSD1306_SEGREMAP | 0x1);
            spi_byte(SSD1306_COMSCANDEC);
            spi_byte(SSD1306_SETCOMPINS); // 0xDA
            spi_byte(0x02);
            spi_byte(SSD1306_SETCONTRAST); // 0x81
            if (SSD1306_VCCSTATE == SSD1306_EXTERNALVCC)
                spi_byte(0x9F);
            else
                spi_byte(0xCF);
            spi_byte(SSD1306_SETPRECHARGE); // 0xd9
            if (SSD1306_VCCSTATE == SSD1306_EXTERNALVCC)
                spi_byte(0x22);
            else
                spi_byte(0xF1);
            spi_byte(SSD1306_SETVCOMDETECT); // 0xDB
            spi_byte(0x40);
            spi_byte(SSD1306_DISPLAYALLON_RESUME); // 0xA4
            spi_byte(SSD1306_NORMALDISPLAY);       // 0xA6
        } else if (this.width == 128 && this.height == 64) {
            // Init sequence taken from datasheet for UG-2864HSWEG01 (128x64 OLED module)
            spi_byte(SSD1306_DISPLAYOFF);         // 0xAE
            spi_byte(SSD1306_SETDISPLAYCLOCKDIV); // 0xD5
            spi_byte(0x80);                       // the suggested ratio 0x80
            spi_byte(SSD1306_SETMULTIPLEX);       // 0xA8
            spi_byte(this.height - 1);
            spi_byte(SSD1306_SETDISPLAYOFFSET);   // 0xD3
            spi_byte(0x0);                        // no offset
            spi_byte(SSD1306_SETSTARTLINE | 0x0); // line #0
            spi_byte(SSD1306_CHARGEPUMP);         // 0x8D
            if (SSD1306_VCCSTATE == SSD1306_EXTERNALVCC)
                spi_byte(0x10);
            else
                spi_byte(0x14);
            spi_byte(SSD1306_SEGREMAP | 0x1);
            spi_byte(SSD1306_COMSCANDEC);
            spi_byte(SSD1306_SETCOMPINS); // 0xDA
            spi_byte(0x12);
            spi_byte(SSD1306_SETCONTRAST); // 0x81
            if (SSD1306_VCCSTATE == SSD1306_EXTERNALVCC)
                spi_byte(0x9F);
            else
                spi_byte(0xCF);
            spi_byte(SSD1306_SETPRECHARGE); // 0xd9
            if (SSD1306_VCCSTATE == SSD1306_EXTERNALVCC)
                spi_byte(0x22);
            else
                spi_byte(0xF1);
            spi_byte(SSD1306_SETVCOMDETECT); // 0xDB
            spi_byte(0x40);
            spi_byte(SSD1306_DISPLAYALLON_RESUME); // 0xA4
            spi_byte(SSD1306_NORMALDISPLAY);       // 0xA6
        } else
            throw new Error('unknown display size');

        // Enable the OLED panel
        spi_byte(SSD1306_DISPLAYON);
        this.spi.transfer(this.pinCS, buf.slice(0, bufPos));
    }

    apply(callback) {
        let buf = new Buffer(1);
        buf[0] = SSD1306_SETSTARTLINE | 0x0; // line #0
        this.spi.transfer(this.pinCS, buf);
        buf = new Buffer(3);

        let i = 0;
        let row = (y) => {
            if (y == (this.height >> 3))
                return callback();

            buf[0] = SSD1306_SETPAGEADDRESS | y;
            buf[1] = SSD1306_SETLOWCOLUMN | (SSHD1306_COLUMN_OFFSET & 0xf); // low col = 0
            buf[2] = SSD1306_SETHIGHCOLUMN | (SSHD1306_COLUMN_OFFSET >> 4); // hi col = 0
            this.spi.transfer(this.pinCS, buf);

            this.spi.flush(() => {
                gpio.pins[this.pinDC].setValue(1);
                this.spi.transfer(this.pinCS, this.buffer.slice(i, i + this.width));
                i += this.width;

                this.spi.flush(() => {
                    gpio.pins[this.pinDC].setValue(0);
                    row(y + 1);
                });
            });
        }
        row(0);
    }

    clearAll(byte) {
        for (let i = 0; i < this.buffer.length; i++)
            this.buffer[i] = byte;
    }

    // simple pixel set functions
    clear(x, y) {
        this.buffer[x + (y >> 3) * this.width] &= ~(1 << (y & 0x07));
    }

    set(x, y) {
        this.buffer[x + (y >> 3) * this.width] |= 1 << (y & 0x07);
    }
}

let spi = new spi.SPI({
    pinSCLK: 19,
    pinMOSI: 23
});
spi.addCS(18);

let display = new OLEDDisplay(spi, {
    width: 128,
    height: 64,
    pinRES: 21,
    pinDC: 20,
    pinCS: 18
});

let led = true;

display.clearAll(0);
function frame() {
    led = !led;
    gpio.pins[gpio.LED_GREEN].setValue(led);
    gpio.pins[gpio.LED_RED].setValue(!led);

    for(let i = 0; i < 10; i++) {
        let x = (Math.random() * 127) | 0;
        let y = (Math.random() * 63) | 0;
        display.set(x, y);
        display.set(x, y + 1);
        display.set(x + 1, y);
        display.set(x + 1, y + 1);

        x = (Math.random() * 127) | 0;
        y = (Math.random() * 63) | 0;
        display.clear(x, y);
        display.clear(x, y + 1);
        display.clear(x + 1, y);
        display.clear(x + 1, y + 1);
    }

    display.apply(() => {
        frame();
    });
}
frame();