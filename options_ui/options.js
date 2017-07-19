// cross-browser support
var storage;
// firefox
if ( typeof(browser) !== 'undefined' ) {
	storage = browser.storage.local;
}
// chrome
else {
	storage = chrome.storage.sync;
}

function restoreOptions() {
	storage.get({
		authid: ''
	}, function(result) {
		document.getElementById('authid').value = result.authid;
	});
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('authid').addEventListener('change', function() { updatePreferenceValue('authid'); });

function updatePreferenceValue(preferanceName) 
{
	var preferenceValue = document.getElementById(preferanceName).value;
	var preferance = {};
	preferance[preferanceName] = preferenceValue;
	storage.set(preferance);
}