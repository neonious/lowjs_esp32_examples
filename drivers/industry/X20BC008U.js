/*
 * X20BC008U.js
 * 
 * A class to interface a B&R X20BC008U bus controller via OPC-UA and read/write all GPIOs
 * of attached X20DI* and X20DO* devices.
 *
 * This class takes care of all error handling. It waits for the Ethernet cable to be
 * connected before trying to connect to the bus controller (otherwise the connection
 * might fail at auto-start when the microcontroller boots). Also, all errors are handled
 * and result into a transparent reconnect which is not noticed outside of the class.
 *
 * All GPIOs of a device are read and written at once for most efficiency.
 * GPIO reads are pushed to the microcontroller via subscriptions, so you can listen
 * for them without using CPU.
 *
 * Example on how to use:
 * 

let br = new X20BC008U("opc.tcp://192.168.1.1:4840");

// Called when inputs of a device change
br.on('input', (deviceIndex, vals) => {
    console.log("Device ", deviceIndex, ":", vals);
    for(let pinIndex = 0; pinIndex < 6; pinIndex++) {
    	// Use only one of both:
        // Option 1: read directly from given bit field
        console.log("  pin ", pinIndex, ": ", (vals & (1 << pinIndex)) ? 1 : 0);
        // Option 2: call br.getLevel (less unreadable arithmetic)
        console.log("  pin ", pinIndex, ": ", br.getLevel(deviceIndex, pinIndex));
    }
});

// Let the 6 outputs of the device flash again and again
const OUTPUT_DEVICE = 4;

let vals = 0;
setInterval(() => {
    br.setLevels(OUTPUT_DEVICE, vals % 64);
    vals++;
}, 100);

 * --- end of example ---
 */

let events = require('events');
let opcua = require('opc-ua');
let lowsys = require('lowsys');

class X20BC008U extends events.EventEmitter {
	/*
	 * API CALLS
	 *
	 * In addition, you can use obj.on('input', (deviceIndex, vals) => {...})
	 * to get changes in input pins pushed to your code. vals is a bit field
	 * of all input values of the device, just as it is returned by obj.getLevels
	 */

    constructor(url) {
		this.mURL = url;
		this.initConnection();
	}
	
    getLevel(deviceIndex, pinIndex) {
        return (this.mVals[deviceIndex] & (1 << pinIndex)) ? 1 : 0;
    }

    getLevels(deviceIndex) {
        return this.mVals[deviceIndex];
    }

    setLevel(deviceIndex, pinIndex, val) {
        if(val)
            this.mVals[deviceIndex] = this.mVals[deviceIndex] | (1 << pinIndex);
        else
            this.mVals[deviceIndex] = this.mVals[deviceIndex] & ~(1 << pinIndex);
        this.writeDevice(deviceIndex);
    }

    setLevels(deviceIndex, vals) {
        this.mVals[deviceIndex] = vals;
        this.writeDevice(deviceIndex);
    }


	/*
	 * EVERYTHING BELOW HERE IS INTERNAL
	 */

	initConnection() {
        this.mInputNodes = {};
        this.mOutputNodes = {};
        this.mVals = [];
        this.mWriteDeviceStatus = [];

		if(this.mClient) {
			this.mClient.destroy();
			this.mClient = null;

			setTimeout(() => { this.initConnection(); }, 1000);
			return;
		}

		this.waitForEthernet(() => {
			let client = this.mClient = new opcua.UAClient({
                url: this.mURL,
                timeout: 5000
            });

			client.on('connect', () => {
                if(client != this.mClient) return;

                client.createSubscription((err, subscription) => {
                    if(client != this.mClient) return;
					if(err) { console.error(err); this.initConnection(); return; }

                    this.mSubscription = subscription;

                    this.listDevices(client, (err, devices) => {
                        if(client != this.mClient) return;
                        if(err) { console.error(err); this.initConnection(); return; }

                        for(let i = 0; i < devices.length; i++) {
                            this.mVals.push(0);
                            if(devices[i].name.substr(0, 5) == "X20DO")
                                this.initOutputDevice(i, devices[i].node);
                            if(devices[i].name.substr(0, 5) == "X20DI")
                                this.initInputDevice(i, devices[i].node);
                        }
                    });
                });
			});

            client.on('dataChanged', (node, val) => {
                if(typeof val != 'number')
                    return;

                let inputIndex = this.mInputNodes[node.node];
                if(inputIndex !== undefined) {
                    this.mVals[inputIndex] = val;
                    this.emit('input', inputIndex, val);
                }
            });

			client.on('error', (err) => {
				console.error("error: ", err);
				console.error("reconnecting");

				this.initConnection();
            });
        });
    }

	waitForEthernet(cb) {
		if(lowsys.status.eth == 'CONNECTED')
			return cb();

		console.log("Waiting for Ethernet cable to be connected...");

		// To make sure low.js does not exit
		let interval = setInterval(() => {}, 100000);
		process.once('lowsysStatusChange', () => {
			console.log("Connected.");

			clearInterval(interval);
			this.waitForEthernet(cb);
		});
	}

	// Returns an array with all devices connected to the X20BC008U, in the format:
	// [{name: 'X20...', node: <the object of the node>}, ...]
	// The array is sorted exactly in the order the devices are connected
	listDevices(client, callback) {
        let client = this.mClient;

		client.objects.subNode('2:DeviceSet/2:X20BC008U/2:X2X/2:SubDevices', (err, node) => {
            if(client != this.mClient) return;
			if(err) return callback(err);

			node.children((err, nodes) => {
                if(client != this.mClient) return;
				if(err) return callback(err);

				var devices = [];
				for(var i = 0; i < nodes.length; i++) {
					var node = nodes[i];
					if(node.browseName.substr(0, 2) != 'ST')
						continue;

					var name = node.displayName;
					var pos = name.indexOf(' | ');
					if(pos >= 0)
						name = name.substr(pos + 3);

					devices[parseInt(node.browseName.substr(2)) - 1] = {
						name: name,
						node: node
					};
				}
				callback(null, devices);
			});
		});
	}

    initInputDevice(index, node) {
        let client = this.mClient;

        // Set to packed format
        node.subNode('2:ParameterSet/2:DigitalInputsPacked', (err, subNode) => {
            if(client != this.mClient) return;
            if(err) { console.error(err); this.initConnection(); return; }

            subNode.write(1, opcua.TYPE_BYTE, (err) => {
                if(client != this.mClient) return;
                if(err) { console.error(err); this.initConnection(); return; }

                node.subNode('2:MethodSet/2:ApplyChanges', (err, subNode) => {
                    if(client != this.mClient) return;
                    if(err) { console.error(err); this.initConnection(); return; }

                    subNode.call((err) => {
                        if(client != this.mClient) return;
                        if(err) { console.error(err); this.initConnection(); return; }

                        // Get packed variable
                        node.subNode('2:ParameterSet/2:DigitalInput', (err, subNode) => {
                            if(client != this.mClient) return;
                            if(err) { console.error(err); this.initConnection(); return; }

                            // Subscribe to it
							this.mSubscription.add(subNode, (err) => {
                                if(client != this.mClient) return;
                                if(err) { console.error(err); this.initConnection(); return; }

                                this.mInputNodes[subNode.node] = index;
							});
                        });
                    });
                });
            });
        });
    }

    initOutputDevice(index, node) {
        let client = this.mClient;

        // Set to packed format
        node.subNode('2:ParameterSet/2:DigitalOutputsPacked', (err, subNode) => {
            if(client != this.mClient) return;
            if(err) { console.error(err); this.initConnection(); return; }

            subNode.write(1, opcua.TYPE_BYTE, (err) => {
                if(client != this.mClient) return;
                if(err) { console.error(err); this.initConnection(); return; }

                node.subNode('2:MethodSet/2:ApplyChanges', (err, subNode) => {
                    if(client != this.mClient) return;
                    if(err) { console.error(err); this.initConnection(); return; }
        
                    subNode.call((err) => {
                        if(client != this.mClient) return;
                        if(err) { console.error(err); this.initConnection(); return; }

                        // Get packed variable
                        node.subNode('2:ParameterSet/2:DigitalOutput', (err, subNode) => {
                            this.mOutputNodes[index] = subNode;
                            this.mWriteDeviceStatus[index] = 0;

                            this.writeDevice(index);
                        });
                    });
                });
            });
        });
    }

    writeDevice(deviceIndex) {
        if(!this.mOutputNodes[deviceIndex] || !this.mClient)
            return;

        if(this.mWriteDeviceStatus[deviceIndex]) {
            this.mWriteDeviceStatus[deviceIndex] = 2;
            return;
        }
        this.mWriteDeviceStatus[deviceIndex] = 1;

        let client = this.mClient;
        this.mOutputNodes[deviceIndex].write(this.mVals[deviceIndex], opcua.TYPE_BYTE, (err) => {
            if(client != this.mClient) return;
            if(err) { console.error(err); this.initConnection(); return; }

            let redo = this.mWriteDeviceStatus[deviceIndex] == 2;
            this.mWriteDeviceStatus[deviceIndex] = 0;

            if(redo)
                this.writeDevice(deviceIndex);
        });
    }
};
