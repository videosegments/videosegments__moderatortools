/**
 * VideoSegments ModeratorTools. Addon for browsers to skip automatically unwanted content in videos
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

document.addEventListener('vs_gotsegments', function(event) {
	// https://bugzilla.mozilla.org/show_bug.cgi?id=999586
	// same issue "Permission denied to access property", bypass by JSON
	var data = JSON.parse(event.detail);
	
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
		console.log('failed: ', crossStorage);
		return;
	}
	
	// request settings 
	crossStorage.get({
		/* editor */
		authid: '',
	}, function(result) {
		/* add authid to preferences */
		data.settings.authid = result.authid;
		
		// delay creation
		setTimeout(function() {
			var editor = Object.create(editorWrapper);
			editor.init(data.segmentsData, data.settings, data.domain, data.id);
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
	
	/*
	 * Initializes class variables, create UI 
	 */
	init: function(segmentsData, settings, domain, id) {
		// console.log('editorWrapper::init()');
		
		// for iframe this will be undefined
		var watchHeader = document.getElementById('watch-header');
		if ( !watchHeader ) {
			// console.log('watch-header not found');
			return;
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
		
		var self = this;
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
		
		// translate button captions
		for ( let i = 0; i < this.segmentsNames.length; ++i ) {
			this.segmentsNames[i] = translator.i18n.getMessage(this.segmentsNames[i]);
		}
		
		for ( let i = 0; i < segmentsTypes.length; ++i ) {
			// define is color dark or light  
			var c = this.settings.segmentsColors[segmentsTypes[i]].replace(/[^\d,]/g, '').split(',');
			var light = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
			var textColor;
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
		controlButtons.appendChild(this.createButton('', translator.i18n.getMessage('sendToDatabaseLabel'), function() {self.sendSegmentsData()}, 'width: 20%; padding: 0; height: 40px;'));
		this.editorDiv.appendChild(controlButtons);
		
		// add editor div to watch header
		watchHeader.insertAdjacentElement('beforeBegin', this.editorDiv);
		this.editorDiv.insertAdjacentElement('afterEnd', document.createElement('br'));
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
		
		// format and display 
		var self = this;
		editorEntry.appendChild(this.createButton('', 'goto', function() {self.goTo(inputStartTime.value);}, 'width: 8%; padding: 0;'));
		editorEntry.appendChild(document.createTextNode('\u00A0')); // &nbsp;
		editorEntry.appendChild(inputStartTime);
		editorEntry.appendChild(document.createTextNode('\u00A0:\u00A0'));
		editorEntry.appendChild(inputEndTime);
		editorEntry.appendChild(document.createTextNode('\u00A0'));
		editorEntry.appendChild(this.createButton('', 'current', function() {self.setCurrentTime(inputEndTime);}, 'width: 8%; padding: 0;'));
		editorEntry.appendChild(document.createTextNode('\u00A0'));
		editorEntry.appendChild(selectSegmentType);
		editorEntry.appendChild(document.createTextNode('\u00A0'));
		
		// remove button 
		editorEntry.appendChild(this.createButton('', 'remove', function() { 
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
			
			self.updateSegmentsPreview();
			// remove node 
			this.parentNode.remove(); 
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
		// var entries = this.editorDiv.getElementsByClassName('vs-editor-entry');
		
		// should be replaced with better code! 
		// this.mediaPlayerWrapper.removeSegmentBar();
		// this.mediaPlayerWrapper.segmentsData = [];
		// this.mediaPlayerWrapper.segmentsData.timestamps = [];
		// this.mediaPlayerWrapper.segmentsData.types = [];
		
		// update timestamps and types 
		// this.mediaPlayerWrapper.segmentsData.timestamps[0] = 0.0;
		// for ( let i = 0; i < entries.length; ++i ) {
			// this.mediaPlayerWrapper.segmentsData.timestamps[i+1] = parseFloat(entries[i].getElementsByClassName('vs-editor-end-time')[0].value);
			// this.mediaPlayerWrapper.segmentsData.types[i] = entries[i].getElementsByClassName('vs-editor-segment-type')[0].value;
		// }
		// should be replaced with better code! 
		// this.mediaPlayerWrapper.insertSegmentBar();
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
		// var timestamps = '', types = ',' + document.getElementById('vs_type_'+(this.segmentsCount-1)).value, descriptions, input;
		// for ( let i = this.segmentsCount-2; i > 0 ; --i) {
			// var input = document.getElementById('vs_input_end_time_'+i);
			// timestamps = ',' + input.value + timestamps;
			// input = document.getElementById('vs_type_'+i);
			// types = ',' + input.value + types;
		// }
		
		// format as json 
		var editorEntries = document.getElementsByClassName('vs-editor-entry');
		var timestamps = '', types = '';
		var lastSegmentIndex = editorEntries.length-1;
		for ( let i = 0; i < lastSegmentIndex; ++i ) {
			timestamps += editorEntries[i].getElementsByClassName('vs-editor-end-time')[0].value + ',';
			types += editorEntries[i].getElementsByClassName('vs-editor-segment-type')[0].value + ',';
		}
		
		// format last segment type manually 
		timestamps = timestamps.slice(0, -1);
		types += editorEntries[lastSegmentIndex].getElementsByClassName('vs-editor-segment-type')[0].value;
		
		// console.log('ts: ', timestamps, 'types: ', types);
		
		// remove first symbols (which is ",")
		// timestamps = timestamps.substr(1);
		// types = types.substr(1);
		
		var self = this;
		var xhr = new XMLHttpRequest();
		xhr.open('POST', 'https://db.videosegments.org/send_segments.php');
		xhr.onreadystatechange = function() { 
			if ( xhr.readyState == 4 ) {
				if ( xhr.status == 200 ) {
					// console.log('responce: ', xhr.responseText);
			
					// server will return '1' if he asking for confirmation (captcha)
					if ( xhr.responseText[0] == '1' ) {
						// all server-side checks is here too. someone who tries to send data 
						// through this without valid authid will be rejected
						self.requestCaptcha(self.settings.authid, timestamps, types);
					}
					else if ( xhr.responseText[0] == '0' ) {
						self.destroy();
						// self.mediaPlayerWrapper.url = null;
						// self.mediaPlayerWrapper.onDurationChange();
						window.location.reload();
					}
				}
			}
		}
		
		// format query 
		var post = 'domain=youtube&video_id='+this.id+'&timestamps='+timestamps+'&types='+types+'&authid='+this.settings.authid;
		xhr.setRequestHeader("content-type", "application/x-www-form-urlencoded");
		xhr.send(post);
	},
	
	/*
	 * Open window with post data.
	 * http://stackoverflow.com/a/14030201
	 */
	requestCaptcha: function(authid, timestamps, types) {
		// console.log('editorWrapper::requestCaptcha()');
		
		var form = document.createElement('form');
		
		// adds to form data 
		function append(key, value) {
			var input = document.createElement('textarea');
			input.setAttribute('name', key);
			input.textContent = value;
			form.appendChild(input);
		}
		
		form.method = 'POST';
		form.action = 'https://db.videosegments.org/confirm_segments.php';
		
		// add post data 
		append('authid', authid);
		append('domain', this.domain);
		append('video_id', this.id);
		append('types', types);
		append('timestamps', timestamps);
		
		this.editorDiv.appendChild(form);
		form.submit();
		form.remove();
	},
	
	/*
	 * Remove editor div's from page 
	 */
	destroy: function() {
		// console.log('editorWrapper::destroy()');
		this.editorDiv.remove();
	},
};

