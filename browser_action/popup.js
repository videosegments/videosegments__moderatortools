var login;
var password;

// load user settings 
// cross-browser support
if ( typeof this.chrome != 'undefined' ) {
	this.browser = this.chrome;
}

browser.storage.local.get({
	login: '',
	password: ''
}, function(result) {
	login = result.login;
	password = result.password;
});

var requestContext = function() {
	var xhr = new XMLHttpRequest();
	xhr.open('POST', 'https://db.videosegments.org/request.php');
	xhr.onreadystatechange = function() { 
		if ( xhr.readyState == 4 ) {
			if ( xhr.status == 200 ) {
				var jsonResponce = JSON.parse(xhr.responseText);
				console.log(jsonResponce);
				if ( typeof jsonResponce.id != 'undefined' ) {
					browser.tabs.query({currentWindow: true, active: true}, function (tab) {
						browser.tabs.update(tab.id, {url: 'https://www.youtube.com/watch?v='+jsonResponce.id});
					});
				}
				else {
					var elem = document.getElementById('noRequestsLabel');
					elem.appendChild(document.createTextNode(browser.i18n.getMessage('noRequestsLabel')));
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