var crossBrowser;
// gecko
if ( (typeof browser != 'undefined') ) {
	crossBrowser = browser;
}
// chromium
else if ( (typeof chrome != 'undefined') ) {
	crossBrowser = chrome;
}

var checkContext = function() { 
	var xhr = new XMLHttpRequest();
	xhr.open('POST', 'https://db.videosegments.org/request.php');
	xhr.onreadystatechange = function() { 
		if ( xhr.readyState == 4 ) {
			if ( xhr.status == 200 ) {
				console.log(xhr.responseText);
				var jsonResponce = JSON.parse(xhr.responseText);
				crossBrowser.browserAction.setBadgeText({text: jsonResponce.count});
			}
		}
	}
	var post = 'check=1';
	xhr.setRequestHeader("content-type", "application/x-www-form-urlencoded");
	xhr.send(post);
}

checkContext();
setInterval(checkContext, 60000);
