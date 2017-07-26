// cross-browser support
if ( typeof this.chrome != 'undefined' ) {
	this.browser = this.chrome;
}

function restoreOptions() {
	browser.storage.local.get({
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
	browser.storage.local.set(preferance, function() {notifyWrapper();});
}

function notifyWrapper()
{
	var querying = browser.tabs.query({}, function(tabs) {
		for ( let i = 0; i < tabs.length; ++i ) {
			browser.tabs.sendMessage(tabs[i].id, {});
		}
	});
}