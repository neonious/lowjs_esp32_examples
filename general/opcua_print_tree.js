/*
 * opcua_print_tree.js
 * 
 * Simple example program which prints the tree of an OPC-UA server
 * It waits for the Ethernet cable to be connected before running
 *
 * Before trying this, set the URL to point to the device you are using
 */

let mod = require('opc-ua');
let lowsys = require('lowsys');

function waitForEthernet(cb) {
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

function handleNode(node, prefix, callback) {
	console.log(prefix + node.namespace + ':' + node.node + ' / ' + node.browseName + ' / ' + node.displayName);

	// Required because the nodes loop back to earlier nodes => without this we get an infinite tree
	if(prefix.length > 4) {
		console.log(prefix + '  ...');
		return;
	}

	node.children((err, arrayOfNodes) => {
		if(err)
			return console.error(err);

		function handleChild() {
			if(arrayOfNodes.length == 0)
				callback();
			else
				handleNode(arrayOfNodes.shift(), prefix + '  ', handleChild);
		}
		handleChild();
	});
}

waitForEthernet(() => {
	let client = new mod.UAClient({
		url: "opc.tcp://192.168.1.1:4840",
	});
	client.on('connect', () => {
		// lookupProps adds browseName and displayName (done automatically by children(),
		// but not with direct access of nodes because this requires a call to the device)
		// at the end, the node given by lookupProbs is client.root, but has the properties
		client.root.lookupProps((err, node) => {
			if(err)
				return console.error(err);

			handleNode(node, '', () => {
				client.destroy();
			});
		});
	});
	client.on('error', (e) => {
		console.log("error with connect or idle connection things: ", e);
	});
});
