if ( typeof this.chrome != 'undefined' ) {
	this.browser = this.chrome;
}

var checkContext = function() { 
	var xhr = new XMLHttpRequest();
	xhr.open('POST', 'https://db.videosegments.org/request.php');
	xhr.onreadystatechange = function() { 
		if ( xhr.readyState == 4 ) {
			if ( xhr.status == 200 ) {
				console.log(xhr.responseText);
				var jsonResponce = JSON.parse(xhr.responseText);
				browser.browserAction.setBadgeText({text: jsonResponce.count});
			}
		}
	}
	var post = 'check=1';
	xhr.setRequestHeader("content-type", "application/x-www-form-urlencoded");
	xhr.send(post);
}

checkContext();
setInterval(checkContext, 60000);
