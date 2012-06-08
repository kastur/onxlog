// Copyright (c) 2012, Kasturi Rangan Raghavan (kastur@gmail.com)
// All rights reserved.
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are met: 
//
// 1. Redistributions of source code must retain the above copyright notice, this
//    list of conditions and the following disclaimer. 
// 2. Redistributions in binary form must reproduce the above copyright notice,
//    this list of conditions and the following disclaimer in the documentation
//    and/or other materials provided with the distribution. 
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
// ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
// WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
// DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
// ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
// (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
// LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
// ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
// (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
// SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
// 
// The views and conclusions contained in the software and documentation are those
// of the authors and should not be interpreted as representing official policies, 
// either expressed or implied, of the FreeBSD Project.

function JSONToServerPusher() {
    this.url = 'http://onxlog.appspot.com/';
}

JSONToServerPusher.prototype.push = function(data, onSuccess) {
    var json_data = JSON.stringify(data);
    var args = {
    	url: this.url,
		type: 'POST',
		data: json_data,
		headers: {'Content-Type': 'application/json'}};

	device.ajax(args, onSuccess, this.onError);
};
	
JSONToServerPusher.prototype.onError = function (textStatus, response) {
	var error = {};
	error.message = textStatus;
	error.statusCode = response.status;
	console.error('upload_via_ajax error: ', error);
};

function StackManager() {
    this.data = {};
	this.stacks = {};
}

StackManager.prototype.getStack = function(key) {
	this.data[key] = [];
	this.stacks[key] = new SignalStack(this.data[key]);
	console.info('StackManager: added ' + key);
	return this.stacks[key];
};

StackManager.prototype.getData = function() {
	return this.data;
};

StackManager.prototype.clearData = function() {
	for (var key in this.data) {
		this.data[key].length = 0;
	}
};

function SignalStack(data_array) {
    console.info('Created SignalStack');
	this._signal_array = data_array;
}

SignalStack.prototype.push = function(signal) {
    console.info('signal: ' + signal.signalType);
	var parsed = this._parse_signal(signal);
	this._signal_array.push(parsed);
};

SignalStack.prototype._parse_signal = function(signal) {
    var parsed = {};
    parsed.signalType = signal.signalType;
    parsed.utcTimestamp = signal.utcTimestamp;
    if (signal.location) {
		var location = {
			'altitude': signal.location.altitude,
			'course': signal.location.course,
			'horizontalAccuracy': signal.location.horizontalAccuracy,
			'latitude': signal.location.latitude,
			'longitude': signal.location.longitude,
			'speed': signal.location.speed,
			'verticalAccuracy': signal.location.verticalAccuracy };
		parsed.location = signal.location;   
	}
    switch(signal.signalType) {
        case 'daemon.screen.off':
        case 'daemon.screen.on':
        case 'daemon.screen.unlock':
            parsed.isOn = signal.isOn;
            parsed.isLocked = signal.isLocked;
            break;
        case 'daemon.battery.updated':
            parsed.isCharging = signal.isCharging;
            parsed.isHigh = signal.isHigh;
            parsed.isLow = signal.isLow;
            parsed.percentage = signal.percentage;
            break;
        case 'daemon.messaging.smsReceived':
            parsed.from = signal.from;
            parsed.body = signal.body;
            break;
        case 'daemon.modeOfTransport.changed':
            parsed.current = signal.current;
            parsed.previous = signal.previous;
            break;
        case 'daemon.network.updated':
            parsed.is3GOn = signal.is3GOn;
            parsed.isWifiOn = signal.isWifiOn;
            break;
        case 'daemon.network.wifiScan':
			parsed.results_length = signal.scanResults.length;
			if (parsed.results_length > 0)
				var results = [];
				var ii;
				for (ii = 0; ii < signal.scanResults.length; ++ii) {
					var new_result = {};
					new_result.BSSID = signal.scanResults[ii].BSSID;
					new_result.SSID = signal.scanResults[ii].SSID;
					new_result.level = signal.scanResults[ii].level;
					results.push();
				}
				parsed.results = results;
			}
            break;
        case 'daemon.telephony.busy':
        case 'daemon.telephony.idle':
        case 'daemon.telephony.incomingCall':
        case 'daemon.telephony.offHook':
        case 'daemon.telephony.outgoingCall':
            parsed.phoneNumber = phoneNumber;
            break;
        case 'daemon.location.changed':
            // signal.location is captured in the beginning.
            break;
    }
    
	return parsed;
};

var stack_manager = new StackManager();
var screen_events = stack_manager.getStack('screen');
device.screen.on('unlock', function(signal) { screen_events.push(signal); });
device.screen.on('on', function(signal) { screen_events.push(signal); });
device.screen.on('off', function(signal) { screen_events.push(signal); });

var battery_events = stack_manager.getStack('battery');
device.battery.on('updated', function(signal) { battery_events.push(signal); });

var messaging_events = stack_manager.getStack('messaging');
device.messaging.on('smsReceived', function(signal) { messaging_events.push(signal); });

var mot_events = stack_manager.getStack('mot');
device.modeOfTransport.on('changed', function(signal) { mot_events.push(signal); });

var network_events = stack_manager.getStack('network');
device.network.on('updated', function(signal) { network_events.push(signal); });

var network_wifiScan_events = stack_manager.getStack('network_wifiScan');
device.network.on('wifiScan', function(signal) { network_wifiScan_events.push(signal); });

var telephony_events = stack_manager.getStack('telephony');
device.telephony.on('busy', function(signal) { telephony_events.push(signal); });
device.telephony.on('idle', function(signal) { telephony_events.push(signal); });
device.telephony.on('incomingCall', function(signal) { telephony_events.push(signal); });
device.telephony.on('offHook', function(signal) { telephony_events.push(signal); });
device.telephony.on('outgoingCall', function(signal) { telephony_events.push(signal); });

var location_events = stack_manager.getStack('location');

var location_cell_listener = device.location.createListener('CELL', 300*1000);
location_cell_listener.on('changed', function(signal) { location_events.push(signal); });

var location_pass_listener = device.location.createListener('PASSIVE', 30*1000);
location_pass_listener.on('changed', function(signal) { location_events.push(signal); });

var remote_events = new JSONToServerPusher();
function upload_data() {
    var data = stack_manager.getData();
	remote_events.push(data, function() { stack_manager.clearData(); });
}

device.scheduler.setTimer({
    name: "upload_all_series_timer", 
    time: 0,
    interval: 600*1000, 
    exact: true },
    upload_data
    );

function persistent_notification() {
    var notification = device.notifications.createNotification("onxlog");
    notification.content = JSON.stringify(stack_manager.getData());
    notification.on('click',function() {
        upload_data();
		persistent_notification();
		
    });
    notification.show();
}

persistent_notification();
