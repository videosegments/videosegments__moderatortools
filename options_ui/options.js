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

function saveOptions() {
	var authid = document.getElementById('authid').value;
	
	storage.set({
		authid: authid
	}, function() {
		// cross browser support
		var translator;
		// firefox
		if ( typeof browser !== 'undefined' ) {
			translator = browser;
		}
		// chrome
		else {
			translator = chrome;
		}
			
		var optionsSaved = document.getElementById('optionsSaved');
		var translation = translator.i18n.getMessage('optionsSaved');
		optionsSaved.appendChild(document.createTextNode(translator.i18n.getMessage('optionsSaved')));
		setTimeout(function() {
			optionsSaved.innerHTML = '\xa0';
		}, 2000);
	});
}

function restoreOptions() {
	storage.get({
		editor: false,
		authid: ''
		
	}, function(result) {
		document.getElementById('authid').value = result.authid;
	});
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('buttonSave').addEventListener('click', saveOptions);