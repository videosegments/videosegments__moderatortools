// cross-browser support
var crossBrowser;
// firefox
if ( typeof(browser) !== 'undefined' ) {
	crossBrowser = browser;
}
// chrome
else {
	crossBrowser = chrome;
}

function restoreOptions() {
	crossBrowser.storage.sync.get({
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
	crossBrowser.storage.sync.set(preferance, function() {notifyWrapper();});
}

function notifyWrapper()
{
	var querying = crossBrowser.tabs.query({}, function(tabs) {
		for ( let i = 0; i < tabs.length; ++i ) {
			crossBrowser.tabs.sendMessage(tabs[i].id, {});
		}
	});
}