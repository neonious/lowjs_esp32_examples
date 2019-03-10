"use strict";

//
//  __      ____      ____      __
//  \ \ /\ / /\ \ /\ / /\ \ /\ / /
//   \ V  V /  \ V  V /  \ V  V /
//    \_/\_/    \_/\_/    \_/\_/
//

// LUMINOSITY
//
const buttonGetLuminosity = document.getElementById("buttonGetLuminosity");
const getLuminosity = function() {
    console.log('Measuring Luminosity');
    const xhr = new XMLHttpRequest();
    xhr.open('GET', '/GetLuminosity');
    xhr.timeout = 8000;
    xhr.ontimeout = function (e) {
        console.log('getLuminosity - Request timed out.');
    };
    xhr.onload = function() {
        if (xhr.status === 200) {
            const luminosity = JSON.parse(xhr.response).luminosity;
            console.log('getLuminosity - Request succeeded.', xhr);
            window.alert(`Luminosity value = ${luminosity}`);
        }
        else {
            console.log('getLuminosity - Request failed with status of ' + xhr.status);
        }
    };
    xhr.send();
}
buttonGetLuminosity.onclick = function(event) {
    getLuminosity();
};


// PLOT LUMINOSITY
//
let intervalPlotLuminosity;
let timingPlotLuminosity = 2000;
const buttonPlotLuminosity = document.getElementById("buttonPlotLuminosity");
const canvasPlotLuminosity = document.getElementById("canvasPlotLuminosity");
const chartColors = {
	red: 'rgb(255, 99, 132)',
	orange: 'rgb(255, 159, 64)',
	yellow: 'rgb(255, 205, 86)',
	green: 'rgb(75, 192, 192)',
	blue: 'rgb(54, 162, 235)',
	purple: 'rgb(153, 102, 255)',
	grey: 'rgb(201, 203, 207)'
};
const chartPlotLuminosity = new Chart(canvasPlotLuminosity.getContext('2d'), {
    type: 'line',
    data: {
        datasets: [{
            label: 'Luminosity',
            backgroundColor: chartColors.red,
            borderColor: chartColors.red,
            data: [],
            fill: false,
        }]
    },
    options: {
        responsive: true,
        legend: {
            display: false
        },
        scales: {
            xAxes: [{
                type: "time",
                display: true,
                scaleLabel: {
                    display: true,
                    labelString: 'Time'
                }
            }],
            yAxes: [{
                display: true,
                scaleLabel: {
                    display: true,
                    labelString: 'Value'
                },
                ticks: {
                    beginAtZero: true,
                    min: 0,
                    max: 1,
                }
            }]
        }
    }
});

function plotLuminosityAjax() {
    if(intervalPlotLuminosity) {
        console.log('Stop plotting Luminosity');
        buttonPlotLuminosity.innerText = 'Plot Luminosity';
        clearInterval(intervalPlotLuminosity);
        intervalPlotLuminosity = false;
    } else {
        console.log('Start plotting Luminosity');
        buttonPlotLuminosity.innerText = 'Stop';
        chartPlotLuminosity.resize();
        intervalPlotLuminosity = setInterval(() => {
            const timestamp = new Date();
            const xhr = new XMLHttpRequest();
            xhr.open('GET', '/GetLuminosity');
            xhr.timeout = timingPlotLuminosity;
            xhr.ontimeout = function (e) {
                console.log('getLuminosity - Request timed out.');
            };
            xhr.onload = function() {
                if (xhr.status === 200) {
                    const luminosity = JSON.parse(xhr.response).luminosity;
                    chartPlotLuminosity.data.datasets[0].data.push({
                        x: timestamp,
                        y: luminosity
                    });
                    chartPlotLuminosity.update({ duration: 0 });
                } else {
                    console.log('getLuminosity - Request failed with status of ' + xhr.status);
                }
            };
            xhr.send();
        }, timingPlotLuminosity);
    }
}

// Returns one line of data from the microcontroller
let xhrStream;
let lastStreamDataPos;
let lastStreamDataTime;

function getStreamDataLine() {
    // console.log('called getStreamDataLine');
    var time = new Date().getTime();

	// readyState 3 (did not recieve data fully) is what we need
    if (
            !xhrStream || // we don't have a request
            (xhrStream.readyState == 3 && xhrStream.status != 200) || // HTTP status is not OK
            xhrStream.readyState == 4 || // readyState 4 means we are no longer streaming, so reconnect in this case
            time - lastStreamDataTime > 30000 // we reset the stream every 30 secs
    ) {
        // console.log('getStreamDataLine - No Request');
        lastStreamDataTime = time;
        lastStreamDataPos = 0;

        if (xhrStream) {
            xhrStream.abort();
        }
        xhrStream = new XMLHttpRequest();
        xhrStream.open("GET", "/GetLuminosityStream");
        xhrStream.send();
    }
    if(xhrStream.readyState == 3) {
        // console.log('getStreamDataLine - Ongoing');
    	// Get the next line from responseText
        var pos = xhrStream.responseText.indexOf("\n", lastStreamDataPos + 1);
        if (pos != -1) {
            var line = xhrStream.responseText.substring(lastStreamDataPos, pos);

            lastStreamDataTime = time;
            lastStreamDataPos = pos;

            return line;
        }
    }
}

function plotLuminosityStream() {
    if(xhrStream) {
        console.log('Stop plotting Luminosity as Stream');
        buttonPlotLuminosity.innerText = 'Plot Luminosity';
        xhrStream.abort();
        intervalPlotLuminosity = false;
    } else {
        console.log('Start plotting Luminosity as Sstream');
        chartPlotLuminosity.resize();
        buttonPlotLuminosity.innerText = 'Stop';
        intervalPlotLuminosity = setInterval(() => {
            const newline = getStreamDataLine();
            if (newline) {
                const parsedline = JSON.parse(newline);
                // console.log('parsedline =', parsedline);
                chartPlotLuminosity.data.datasets[0].data.push({
                    x: parsedline.timestamp,
                    y: 1 - parsedline.luminosity // is a resistor so current decreases as luminosity increases
                });
                chartPlotLuminosity.update({ duration: 0 });
            }
        }, 30);
    }
}

buttonPlotLuminosity.onclick = function(event) {
    // plotLuminosityAjax();
    plotLuminosityStream();
};
