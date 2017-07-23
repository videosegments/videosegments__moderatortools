var login;
var password;

// load user settings 
// cross-browser support
var crossStorage;
// gecko
if ( (typeof browser != 'undefined') && browser.storage ) {
	crossStorage = browser.storage.local;
}
// chromium
else if ( (typeof chrome != 'undefined') && chrome.storage ) {
	crossStorage = chrome.storage.sync;
}
else {
	crossStorage = null;
}

crossStorage.get({
	login: '',
	password: ''
}, function(result) {
	login = result.login;
	password = result.password;
});

// cross browser support
var crossBrowser;
// firefox
if ( typeof browser !== 'undefined' ) {
	crossBrowser = browser;
}
// chrome
else {
	crossBrowser = chrome;
}

var requestContext = function() {
	var xhr = new XMLHttpRequest();
	xhr.open('POST', 'https://db.videosegments.org/request.php');
	xhr.onreadystatechange = function() { 
		if ( xhr.readyState == 4 ) {
			if ( xhr.status == 200 ) {
				var jsonResponce = JSON.parse(xhr.responseText);
				console.log(jsonResponce);
				if ( typeof jsonResponce.id != 'undefined' ) {
					crossBrowser.tabs.query({currentWindow: true, active: true}, function (tab) {
						crossBrowser.tabs.update(tab.id, {url: 'https://www.youtube.com/watch?v='+jsonResponce.id});
					});
				}
				else {
					var elem = document.getElementById('noRequestsLabel');
					elem.appendChild(document.createTextNode(crossBrowser.i18n.getMessage('noRequestsLabel')));
					elem.style.color = 'red';
					elem.style.textAlign = 'center';
					setTimeout(function() { 
						elem.innerHTML = ''; 
						document.getElementById('goToRequestLabel').addEventListener('click', requestContext); 
					}, 2000);
					document.getElementById('goToRequestLabel').removeEventListener('click', requestContext);
				}
			}
		}
	}
	
	var post = 'login='+login+'&password='+password;
	// console.log(post);
	xhr.setRequestHeader("content-type", "application/x-www-form-urlencoded");
	xhr.send(post);
}

document.getElementById('goToRequestLabel').addEventListener('click', requestContext);