// cross browser support
if ( typeof this.chrome != 'undefined' ) {
	this.browser = this.chrome;
}

/* there must be a proper way to do it */
function translateTextById(id) {
	var currentElement = document.getElementById(id);
	if ( currentElement ) {
		currentElement.appendChild(document.createTextNode(browser.i18n.getMessage(id)));
	}
}

translateTextById('loginLabel');
translateTextById('passwordLabel');
