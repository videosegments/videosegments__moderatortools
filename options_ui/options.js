// cross-browser support
var crossStorage;
// firefox
if ( typeof(browser) !== 'undefined' ) {
	crossStorage = browser.storage.local;
}
// chrome
else {
	crossStorage = chrome.storage.sync;
}

function restoreOptions() {
	crossStorage.get({
		login: '',
		password: ''
	}, function(result) {
		document.getElementById('login').value = result.login;
		document.getElementById('password').value = result.password;
	});
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('login').addEventListener('change', function() { updatePreferenceValue(this.id); });
document.getElementById('password').addEventListener('change', function() { updatePreferenceValue(this.id); });

function updatePreferenceValue(preferanceName) 
{
	var preferenceValue = document.getElementById(preferanceName).value;
	var preferance = {};
	preferance[preferanceName] = preferenceValue;
	crossStorage.set(preferance);
}