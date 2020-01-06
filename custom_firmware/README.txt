Custom Firmware Example


This example shows how to

- Create a low.js project which is compiled into a custom firmware image. This firmware image can then be bulked flashed onto ESP32-WROVER devices or used to update the device over the website served by the low.js program (Over-The-Air updating)

- Program a password protected single-page website application in Vue, to be served from the microcontroller. On this website, you can change settings (Wifi SSID & password, website password) and, as written above, upload a newer version of the firmware image to update the device through the website.

For more information on low.js custom firmware, see the documentation at https://www.neonious.com/lowjs/documentation/custom-firmware.html


***** HOW TO COMPILE AND RUN *****

In the full version of this example, you need a key for low.js Professional (see https://www.neonious.com/Store ), as it shows how to use Over-The-Air updating.

If you want to run this example without Over-The-Air updating, you can set the values for the keys "pro" and "ota_update_support" to false in lowbuild.config.json. Then you do not need the key, but you will still need a ESP32-WROVER board with 16 MB Flash.

With the key:

- Install lowsync (see https://www.neonious.com/lowjs/examples/getting-started.html)

- Call npm install

- Set the two variables PRO_KEY and FLASH_PORT in the Makefile

- Call make flash

  If you do not have make installed, you can run the commands directly, as written in the Makefile (there are not to many commands which the Makefile calls).

- Connect to the Wifi "Custom Firmware Example" with the password "customfirmware"

- Login to the website with the password "customfirmware"


***** HOW TO USE THE TEST SERVER *****

The project includes a test server (implemented in the test_server directory) which runs on the PC with Node.JS and which you can start with

make run-test

This way, you do not need to flash an ESP32-WROVER device for every change of the website.


***** STATIC FILES / SETTINGS *****

The following settings, specified in lowbuild.config.json, are relevant to know:

This project includes the user code files as static files. They are interleaved with the editable file system, however cannot be changed or deleted.

This way no byte of the editable file system is used for the user code files, also static files are far faster than file system files, especially if the setting only_static_files is used, as done here.

Because the factory files entry is set to null, a factory reset of the board will simply clear all editable files, keeping only the static files.

The ports for neonious IDE/lowsync are closed, so they are not accessable.


***** REPOSITORY FILES / DIRECTORIES *****

The project consists of following parts:

- Vue CLI based client/webbrowser project
- The microcontroller JavaScript source code

In detail, these parts use the following files/directories:


** Vue CLI based client:

public: Static files to be served to the webbrowser

src: The client code
It is transpiled by Vue CLI which uses Babel, so you can use newest JavaScript.

dist: The compiled output
dist/ is linked to file_system/dist, so on the microcontroller it ends up in /dist/

package.json:
package-lock.json:
Holds dependencies and script commands for the Vue CLI part

babel.config.js: Config file which is used for transpilation of the client
postcss.config.js: Yet anouther config of Vue CLI


** The microcontroller JavaScript source code

server: The source code
It is transpiled by lowsync which uses Babel, so you can use newest JavaScript.

server/ is transpiled by the Makefile to file_system/server/. The lowsync built-in transpilation is not used (disabled in lowsync.config.json), because this would also transpile the Vue project, which is already transpiled by Vue CLI.


** All together

file_system:
This is the file system structure of the mirocontroller.
Most content is just linked from other directories. lowsync will always follow the links,
not use the symbolic links themselves.

lowbuild.config.json
The config file for the firmware, see STATIC FILES / SETTINGS above.
