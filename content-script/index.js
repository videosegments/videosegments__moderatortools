/**
 * VideoSegments ModeratorTools. Tools for video segmentation
 * Copyright (C) 2017  Alex Lys
 * 
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301  USA
 */

// cross-browser support
if ( typeof this.chrome != 'undefined' ) {
	this.browser = this.chrome;
}

var wrapper;

document.addEventListener('vsgotsegments', function(event) {
	// https://bugzilla.mozilla.org/show_bug.cgi?id=999586
	// same issue "Permission denied to access property", bypass by JSON
	var data = JSON.parse(event.detail);
	
	// request settings 
	browser.storage.local.get({
		/* editor */
		login: '',
		password: ''
	}, function(result) {
		/* add authid to preferences */
		data.settings.login = result.login;
		data.settings.password = result.password;
		
		// delay creation
		setTimeout(function() {
			wrapper = Object.create(editorWrapper);
			wrapper.init(data.segmentsData, data.settings, data.domain, data.id);
		}, 1000);
	});
});

/**
 * Class for handling segments moderation 
 */
var editorWrapper = {
	/* media player */
	mediaPlayer: null,
	/* DOM-element of editor */
	editorDiv: null,
	/* user preferences */
	settings: null,
	/* current video domain */
	domain: null,
	/* current video id */
	id: null,
	/* translation of segments names */
	segmentsNames: null,
	/* modal window for captcha */
	modal: null,
	/* prevent leaving without confirmation */
	hasChanges: null,
	
	/*
	 * Initializes class variables, create UI 
	 */
	init: function(segmentsData, settings, domain, id) {
		// console.log('editorWrapper::init()');
		
		// for iframe this will be undefined
		var watchHeader = document.getElementById('info-contents');
		if ( !watchHeader ) {
			// console.log('watch-header not found');
			
			watchHeader = document.getElementById('watch-header');
			if ( !watchHeader ) {
				return;
			}
		}
		
		// save variables
		this.mediaPlayer = document.getElementsByTagName('video')[0];
		this.settings = settings;
		this.domain = domain;
		this.id = id;
		
		// create div for editor
		this.editorDiv = document.createElement('div');
		this.editorDiv.id = 'vs-editor';
		this.editorDiv.style = 'text-align: center; background: white; box-shadow: 0 1px 2px rgba(0,0,0,.1); padding: 10px;';
		
		// div for segments data 
		var segmentsEditor = document.createElement('div');
		segmentsEditor.id = 'vs-editor-entries';
		
		// prevent accidential page leaving
		var self = this;
		this.hasChanges = false;
		var a = document.getElementsByTagName('a');
		for ( let i = 0; i < a.length; ++i ) {
			a[i].onclick = function(e) {
				if ( self.hasChanges ) {
					if ( !confirm(browser.i18n.getMessage('changesAreNotSaved')) ) {
						e.preventDefault();
					}
				}
			}
		}
		window.onbeforeunload = function() {
			if ( self.hasChanges ) {
				return browser.i18n.getMessage('changesAreNotSaved');
			}
		};
		
		// create buttons for each type of segments 
		// c  - content 
		// i  - intro 
		// a  - advertisement 
		// cs - cutscene 
		// ia - interactive
		// cr - credits 
		// o  - offtop 
		// s  - scam		
		var segmentsButtons = document.createElement('div');
		segmentsButtons.id = 'vs-segments-buttons';
		segmentsButtons.style = 'display: flex; justify-content: space-between;';
		var segmentsTypes = ['c', 'i', 'a', 'cs', 'ia', 'cr', 'o', 's'];
		this.segmentsNames = ['segmentContentLabel', 'segmentIntroLabel', 'segmentAdvertisementLabel', 'segmentCutsceneLabel', 'segmentInteractiveLabel', 'segmentCreditsLabel', 'segmentOfftopLabel', 'segmentScamLabel'];
		var segmentsColors = [	this.settings.colorContent, this.settings.colorIntro, this.settings.colorAdvertisement, this.settings.colorCutscene, 
								this.settings.colorInteractive, this.settings.colorCredits, this.settings.colorOfftop, this.settings.colorScam];
				
		// translate button captions
		for ( let i = 0; i < this.segmentsNames.length; ++i ) {
			this.segmentsNames[i] = browser.i18n.getMessage(this.segmentsNames[i]);
		}
		
		for ( let i = 0; i < segmentsTypes.length; ++i ) {
			// define is color dark or light  
			// https://stackoverflow.com/a/12043228
			var c = this.settings.segmentsColors[segmentsTypes[i]].substring(1);
			var rgb = parseInt(c, 16);   // convert rrggbb to decimal
			var r = (rgb >> 16) & 0xff;  // extract red
			var g = (rgb >>  8) & 0xff;  // extract green
			var b = (rgb >>  0) & 0xff;  // extract blue
			
			var textColor;
			var light = 0.2126 * r + 0.7152 * g + 0.0722 * b;
			if (light < 50) {
				textColor = 'white';
			}
			else {
				textColor = 'black';
			}
			
			// add buttons and define thier behavior 
			segmentsButtons.appendChild(this.createButton(segmentsTypes[i], this.segmentsNames[i], function() {
					var entries = self.editorDiv.getElementsByClassName('vs-editor-entry');
					// if there is no entries
					if ( entries.length == 0 ) {
						// add first
						self.addSegmentEntry(segmentsEditor, 0.0, self.mediaPlayer.duration, this.name);
					}
					else {
						if ( entries.length > 1 ) {
							// find position to insert
							var entry, j;
							for ( j = 0; j < entries.length; ++j ) {
								entry = entries[j];
								if ( entry.getElementsByClassName('vs-editor-end-time')[0].value > self.mediaPlayer.currentTime ) {
									break;
								}
							}
							
							// if end then append
							if ( j == entries.length-1 ) {
								self.addSegmentEntry(segmentsEditor, self.mediaPlayer.currentTime, self.mediaPlayer.duration, this.name);
								entry.getElementsByClassName('vs-editor-end-time')[0].value = self.mediaPlayer.currentTime.toFixed(2);
							}
							// else insert 
							else {
								self.insertSegmentEntry(entry, self.mediaPlayer.currentTime, parseFloat(entry.getElementsByClassName('vs-editor-end-time')[0].value), this.name);
								entry.getElementsByClassName('vs-editor-end-time')[0].value = self.mediaPlayer.currentTime.toFixed(2);
							}
						}
						// it will be removed later
						else {
							var prevEntry = entries[entries.length-1];
							prevEntry.getElementsByClassName('vs-editor-end-time')[0].value = self.mediaPlayer.currentTime.toFixed(2);
							self.addSegmentEntry(segmentsEditor, self.mediaPlayer.currentTime, self.mediaPlayer.duration, this.name);
						}
					}
					
					// update preview 
					self.updateSegmentsPreview();
					// }
				}, 'width: 11.5%; padding: 0; background-color: ' + this.settings.segmentsColors[segmentsTypes[i]] + '; border: none; cursor: pointer; box-shadow: 0 1px 0 rgba(0,0,0,0.05); color: ' + textColor + ';'));
		}
		
		// add buttons 
		this.editorDiv.appendChild(segmentsButtons);
		this.editorDiv.appendChild(document.createElement('br'));
		
		// if segments already exists
		if ( segmentsData ) {
			// create lines based on this data 
			var segments = segmentsData.timestamps.length;
			for ( let i = 0; i < segments-1; ++i ) {
				this.addSegmentEntry(segmentsEditor, segmentsData.timestamps[i], segmentsData.timestamps[i+1], segmentsData.types[i]);
			}
		}
		// create default line 
		else {
			// this.addSegmentEntry(segmentsEditor, 0.0, this.mediaPlayerWrapper.mediaPlayer.duration, 'c');
		}
		this.editorDiv.appendChild(segmentsEditor);
		this.editorDiv.appendChild(document.createElement('br'));
		
		// create send button 
		var controlButtons = document.createElement('div');
		controlButtons.id = 'vs-control-buttons';
		controlButtons.style = 'text-align: right;';
		controlButtons.appendChild(this.createButton('', browser.i18n.getMessage('sendToDatabaseLabel'), function() {self.sendSegmentsData()}, 'width: 20%; padding: 0; height: 40px;'));
		this.editorDiv.appendChild(controlButtons);
		
		// add editor div to watch header
		watchHeader.insertAdjacentElement('afterBegin', this.editorDiv);
		this.editorDiv.insertAdjacentElement('afterEnd', document.createElement('br'));
		
		// modal for captcha 
		this.modal = document.createElement('div');
		var modalContent = document.createElement('div');
		
		this.modal.id = 'vs-captcha-modal';
		this.modal.style = 'display: none; position: fixed; z-index: 2000000000; padding-top: 100px; left: 0; top: 0; width: 100%; height: 100%; overflow: auto; background-color: rgb(0,0,0); background-color: rgba(0,0,0,0.8);';
		modalContent.style = 'background-color: #fefefe; margin: auto; border: 1px solid #888; width: 350px';
		
		this.modal.appendChild(modalContent);
		this.editorDiv.appendChild(this.modal);
	},
	
	/*
	 * Creates line with segment information
	 */
	createSegmentEntry: function(startTime, endTime, type) {
		// container for row 
		var editorEntry = document.createElement('div');
		editorEntry.className = 'vs-editor-entry';
		
		// start time 
		var inputStartTime = document.createElement('input');
		inputStartTime.type = 'text';
		inputStartTime.className = 'vs-editor-start-time';
		inputStartTime.value = startTime.toFixed(2);
		inputStartTime.size = 6;
		inputStartTime.style = 'text-align: center';
		
		// end time 
		var inputEndTime = document.createElement('input');
		inputEndTime.type = 'text';
		inputEndTime.className = 'vs-editor-end-time';
		inputEndTime.value = endTime.toFixed(2);
		inputEndTime.size = 6;
		inputEndTime.style = 'text-align: center';
		// update next segment start time
		inputEndTime.onkeyup = function() {
			var nextEntry = this.parentNode.nextSibling;
			if ( nextEntry ) {
				var nextInput = nextEntry.getElementsByClassName('vs-editor-start-time')[0];
				nextInput.value = this.value;
			}
			self.updateSegmentsPreview();
		};
		
		// type of segment 
		var selectSegmentType = document.createElement('select');
		selectSegmentType.className = 'vs-editor-segment-type';
		
		// add segment types 
		var segmentsTypes = ['c', 'i', 'a', 'cs', 'ia', 'cr', 'o', 's'];
		for ( var i = 0; i < segmentsTypes.length; ++i ) {
			var optionSegmentType = document.createElement('option');
			optionSegmentType.value = segmentsTypes[i];
			optionSegmentType.text = this.segmentsNames[i];
			selectSegmentType.appendChild(optionSegmentType);
		}
		selectSegmentType.value = type;
		selectSegmentType.onchange = function() {
			self.updateSegmentsPreview();
		}
		
		// format and display 
		var self = this;
		editorEntry.appendChild(this.createButton('', browser.i18n.getMessage('goToLabel'), function() {self.goTo(inputStartTime.value);}, 'width: 8%; padding: 0;'));
		editorEntry.appendChild(document.createTextNode('\u00A0')); // &nbsp;
		editorEntry.appendChild(inputStartTime);
		editorEntry.appendChild(document.createTextNode('\u00A0:\u00A0'));
		editorEntry.appendChild(inputEndTime);
		editorEntry.appendChild(document.createTextNode('\u00A0'));
		editorEntry.appendChild(this.createButton('', browser.i18n.getMessage('currentTimeLabel'), function() {self.setCurrentTime(inputEndTime);}, 'width: 8%; padding: 0;'));
		editorEntry.appendChild(document.createTextNode('\u00A0'));
		editorEntry.appendChild(selectSegmentType);
		editorEntry.appendChild(document.createTextNode('\u00A0'));
		
		// remove button 
		editorEntry.appendChild(this.createButton('', browser.i18n.getMessage('removeLabel'), function() { 
			// look for next and previous rows 
			var prevEntry = this.parentNode.previousSibling;
			var nextEntry = this.parentNode.nextSibling;
			// if previous row found 
			if ( prevEntry ) {
				// and next too 
				if ( nextEntry ) {
					// connect previous with next 
					prevEntry.getElementsByClassName('vs-editor-end-time')[0].value = nextEntry.getElementsByClassName('vs-editor-start-time')[0].value;
				}
				else {
					// update previous row 
					prevEntry.getElementsByClassName('vs-editor-end-time')[0].value = self.mediaPlayer.duration.toFixed(2);
				}
			}
			// only next row exists 
			else if ( nextEntry ) {
				// set start time to zero 
				var buffer = 0;
				nextEntry.getElementsByClassName('vs-editor-start-time')[0].value = buffer.toFixed(2);
			}
			// nothing found, create default line 
			// else {
				// self.addSegmentEntry(segmentsEditor, 0.0, self.mediaPlayerWrapper.mediaPlayer.duration, 'c');
			// }
			
			// remove node 
			this.parentNode.remove(); 
			self.updateSegmentsPreview();
		}, 'width: 8%; padding: 0;'));
		
		return editorEntry;
	},
	
	/*
	 * Adds segment information to end of editor 
	 */ 
	addSegmentEntry: function(segmentsEditor, startTime, endTime, type) {
		segmentsEditor.appendChild(this.createSegmentEntry(startTime, endTime, type));
	},
	
	/*
	 * Inserts segment information to given position 
	 */ 
	insertSegmentEntry: function(prevElement, startTime, endTime, type) {
		prevElement.insertAdjacentElement('AfterEnd', this.createSegmentEntry(startTime, endTime, type));
	},
	
	/*
	 * Updates preview of segments
	 */ 
	updateSegmentsPreview: function() {
		// console.log('editorWrapper::updateSegmentsPreview()');
		var entries = this.editorDiv.getElementsByClassName('vs-editor-entry');
		
		var segmentsData = {};
		segmentsData.timestamps = [];
		segmentsData.types = [];
		
		// update timestamps and types 
		segmentsData.timestamps[0] = 0.0;
		for ( let i = 0; i < entries.length; ++i ) {
			segmentsData.timestamps[i+1] = parseFloat(entries[i].getElementsByClassName('vs-editor-end-time')[0].value);
			segmentsData.types[i] = entries[i].getElementsByClassName('vs-editor-segment-type')[0].value;
		}
		
		var event = new CustomEvent('vssegmentsupdated', { 
			detail: JSON.stringify({
				segmentsData: segmentsData
			})
		});
		document.dispatchEvent(event);
		this.hasChanges = true;
	},
	
	/*
	 * Create button 
	 */
	createButton: function(name, text, onclick, style) {
		var button = document.createElement('input');
		button.name = name;
		button.type = 'button';
		button.value = text;
		button.style = style;
		button.onclick = onclick;
		return button;
	},
	
	/*
	 * Set input as current time based on media player 
	 */
	setCurrentTime: function(input) {
		// console.log('editorWrapper::setCurrentTime()');
		
		// update time on next entiry 
		input.value = this.mediaPlayer.currentTime.toFixed(2);
		input.onkeyup();
	},
	
	/*
	 * Rewind player to time of segment 
	 */
	goTo: function(value) {
		// console.log('editorWrapper::goTo()');
		
		this.mediaPlayer.currentTime = value;
	},
	
	/*
	 * Send segments data to database 
	 */
	sendSegmentsData: function() {
		// console.log('editorWrapper::sendSegmentsData()');
		
		// format as json 
		var editorEntries = document.getElementsByClassName('vs-editor-entry');
		var timestamps = '', types = '';
		
		if ( editorEntries.length > 0 ) {
			var lastSegmentIndex = editorEntries.length-1;
			for ( let i = 0; i < lastSegmentIndex; ++i ) {
				timestamps += editorEntries[i].getElementsByClassName('vs-editor-end-time')[0].value + ',';
				types += editorEntries[i].getElementsByClassName('vs-editor-segment-type')[0].value + ',';
			}
			
			// format last segment type manually 
			timestamps = timestamps.slice(0, -1);
			types += editorEntries[lastSegmentIndex].getElementsByClassName('vs-editor-segment-type')[0].value;
		}
		else {
			types = 'c';
		}
		
		var self = this;		
		var xhr = new XMLHttpRequest();
		xhr.open('POST', 'https://db.videosegments.org/send.php');
		xhr.onreadystatechange = function() { 
			if ( xhr.readyState == 4 ) {
				if ( xhr.status == 200 ) {
					// console.log('responce: ', xhr.responseText);
					var jsonResponse = JSON.parse(xhr.responseText);
					
					if ( jsonResponse.message === 'captcha' ) {
						self.modal.style.display = "block";
						
						var iframe = document.createElement("iframe");
						iframe.src = 'https://db.videosegments.org/captcha.php';
						iframe.width  = 350;
						iframe.height = 500;
						iframe.id = 'vs-captcha-iframe';
						self.modal.childNodes[0].appendChild(iframe);
						
						var messageContext = function(event) { 
							self.checkCaptcha(event, timestamps, types, messageContext, clickContext); 
						}
						
						var clickContext = function(event) { 
							if ( event.target == self.modal ) {
								self.modal.style.display = "none";
								self.modal.childNodes[0].childNodes[0].remove();
								window.removeEventListener('message', messageContext);
								window.removeEventListener('click', clickContext);
							}
						}
						
						window.addEventListener('message', messageContext);
						window.addEventListener('click', clickContext);
					}
					else {
						if ( jsonResponse.message === 'updated' || jsonResponse.message === 'added' || jsonResponse.message === 'overwritten' ) {
							setTimeout(function() {
								window.location.reload();
							}, 100);
						}
						else {
							window.alert('VideoSegments: ' + jsonResponse.message);
						}
					}
				}
			}
		};
		
		var post = 'domain='+this.domain+'&id='+this.id+'&login='+this.settings.login+'&password='+this.settings.password+'&timestamps='+timestamps+'&types='+types;
		xhr.setRequestHeader("content-type", "application/x-www-form-urlencoded");
		xhr.send(post);
	},
	
	checkCaptcha: function(event, timestamps, types, messageContext, clickContext)
	{
		if ( event.origin === 'https://db.videosegments.org' ) {
			var self = this;
			var xhr = new XMLHttpRequest();
			xhr.open('POST', 'https://db.videosegments.org/send.php');
			
			xhr.onreadystatechange = function() { 
				if ( xhr.readyState == 4 ) {
					if ( xhr.status == 200 ) {
						// console.log('responce: ', xhr.responseText);
						self.modal.style.display = "none";
						self.modal.childNodes[0].childNodes[0].remove();
						
						if ( jsonResponse.message === 'updated' || jsonResponse.message === 'updated' || jsonResponse.message === 'updated' ) {
							setTimeout(function() {
								window.location.reload();
							}, 100);
						}
						else {
							window.alert('VideoSegments: ' + jsonResponse.message);
						}
					}
				}
			};
			
			var post = 'domain='+this.domain+'&id='+this.id+'&login='+this.settings.login+'&password='+this.settings.password+'&timestamps='+timestamps+'&types='+types+'&captcha='+event.data;
			// console.log(post);
			
			xhr.setRequestHeader("content-type", "application/x-www-form-urlencoded");
			xhr.send(post);
			
			window.removeEventListener('message', messageContext);
			window.removeEventListener('click', clickContext);
		}
	},
	
	/*
	 * Remove editor div's from page 
	 */
	destroy: function() {
		// console.log('editorWrapper::destroy()');
		this.editorDiv.remove();
	},
};

// on settings update
browser.runtime.onMessage.addListener(
	function(request, sender, sendResponse) {
		if ( wrapper ) {
			// request settings 
			browser.storage.local.get({
				/* editor */
				login: '',
				password: ''
			}, function(result) {
				if ( wrapper ) {
					wrapper.settings = result;
				}
			});
		}
	}
);
