# Table Radar

This is the table radar, an example project for the neonious one microcontroller board.

It implements an radar for your table, which detects items in short range. You can view the radar through your web browser.

A video of the table radar in action: https://drive.google.com/file/d/1G6cykg5DXdzrsAG8MDHQRWeSNzXArNSn/view


## Hardware setup

The hardware consists of

- a neonious one microcontroller board serving the website and controlling motor + sensor. More information about the neonious one board: http://www.neonious.com/

- a servo motor (a motor which you can position at any angle)
- a distance sensor mounted onto the servo motor with glue
- a 5 V power supply

The servo motor is just one we picked of the shelf. You can take any one, as the protocol is standarized (one pulse of about 1 ms to position the servo).

The distance sensor is the Pololu Carrier with Sharp GP2Y0A60SZLF Analog Distance Sensor 10-150cm, 3V. It gives out an analog signal which we can read out easily with the ADC (analog to digital converter) of the board. There are cheaper options, but I had one left from an older project.

The servo motor is connected to the board via pin 6. The distance sensor is connected via pin 8 (which supports ADC).
