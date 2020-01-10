"use strict";

// the text file containing a list of filenames
const FILE_LIST = "list.txt"

// the directory for filenames
const FILE_FOLDER = "text/"

// hanging punctuation
const CHAR_PUNC = "。、，";

// regex for processing text
/*
	Hangul Jamo \u1160 \u11ff
	Hangul Jamo Extended-A \ua960 \ua97f
	Hangul Jamo Extended-B \ud7b0 \ud7ff
*/
const REGEX_CHAR_PATTERN = new RegExp(
	(
		"(?:" +
		[
			"(\\([^)]+\\))", // warityuu text
			"(&KR\\d+;)", // Kanripo gaizi
			"(.[\u1160-\u11ff\ua960-\ua97f\ud7b0-\ud7ff]*)([" + CHAR_PUNC + "]*)",
		].join("|") +
		")"
	),
	"g",
);

window.addEventListener("load", function() {
	fetchList();

	setUpCss();
	document.getElementById("tsong-text-selection").addEventListener("change", fetchText);
	document.getElementById("tsong-text-raw").addEventListener("input", displayText);
});

function fetchList() {
	fetch(FILE_LIST)
		.then(checkStatus)
		.then(loadList)
		.then(fetchText) // XXX
		.catch(console.log);
}

function loadList(text) {
	text = text.split("\n");

	for (let i = 0; i < text.length; i++) {
		let option = document.createElement("option");
		option.value = text[i];
		option.innerText = text[i];
		document.getElementById("tsong-text-selection").appendChild(option);
	}
}

function fetchText() {
	let filename = document.getElementById("tsong-text-selection").value;

	fetch(FILE_FOLDER + filename)
		.then(checkStatus)
		.then(loadText)
		.then(displayText)
		.catch(console.log);
}

function loadText(text) {
	// write text to text box
	document.getElementById("tsong-text-raw").value = text;
}

function displayText() {
	// read text from text box
	let text = document.getElementById("tsong-text-raw").value;

	// convert plain text to pages and lines
	text = processText(text);

	// remove old text
	document.getElementById("tsong-text").innerText = "";

	// add new text
	for (let i = 0; i < text.length; i++) {
		let page = createPage(text[i]);
		document.getElementById("tsong-text").appendChild(page);
	}
}

function processText(text) {
	let ret = [];

	// remove comments and newlines
	text = text.replace(/(#.+|\n)/g, "");

	let pages = text.split(/¶*<pb:(.*?)>¶*/);
	for (let i = 1; i < pages.length; i += 2) {
		ret.push({
			"pageNumber": pages[i],
			"pageText": pages[i + 1]
				.replace(/¶\s*$/g, "") // do not create an empty trailing line
				.split("¶"),
		});
	}

	return ret;
}

function createPage(text) {
	let page = document.createElement("p");
	page.classList.add("tsong-page");
	page.id = text["pageNumber"];

	for (let i = 0; i < text["pageText"].length; i++) {
		let line = createLine(text["pageText"][i]);
		page.appendChild(line);
	}

	return page;
}

function createLine(text) {
	let line = document.createElement("span");
	line.classList.add("tsong-line");

	text = tagLine(text);
	line.innerHTML = text;

	return line;
}

function tagLine(text) {
	text = text.replace(REGEX_CHAR_PATTERN, function(full_match, warityuu, gaizi, zi, hangingPunc) {
		if (warityuu) {
			return (
				"<span class=\"tsong-wt\">" +
				warityuu.replace(
					/(?:\((.*)\/(.*)\)|\((.*)\))/g,
					function(full_match, lineAText, lineBText, lineMonoText) {
						if (lineMonoText) {
							return "<span class=\"tsong-wt-mono\">" + tagLine(lineMonoText) + "</span>";
						} else {
							return "<span class=\"tsong-wt-a\">" + tagLine(lineAText) + "</span><span class=\"tsong-wt-b\">" + tagLine(lineBText) + "</span>";
						}
					}
				) +
				"</span>"
			);
		} else if (gaizi) {
			return "<span class=\"tsong-char tsong-gaizi\" title=\"" + gaizi +"\">〓</span>";
		} else {
			return "<span class=\"tsong-char\">" + zi + (hangingPunc ? "<span class=\"tsong-punc\">" + hangingPunc + "</span>" : "") + "</span>";
		}
	});

	return text;
}

function setUpCss() {
	let inputs = document.getElementsByTagName("input");
	for (let i = 0; i < inputs.length; i++) {
		inputs[i].addEventListener("change", function(event) {
			updateCss(event.target.id);
		});

		let style = document.createElement("style");
		style.id = "css-" + inputs[i].id;
		document.head.appendChild(style);
	}
}

function updateCss(id) {
	let style = document.getElementById("css-" + id);

	switch(id) {
		case "tsong-vertical-character-spacing":
			style.innerHTML = `
				.tsong-page {
					line-height: ${event.target.value}em;
				}
			`;
			break;
		case "tsong-warityuu-character-height":
			style.innerHTML = `
				.tsong-wt .tsong-char {
					transform: scaleY(${event.target.value}) scaleX(${1 + (event.target.value - 1) * .25});
				}

				.tsong-wt-a {
					left: ${.25 + (event.target.value - 1) * .15}em
				}

				.tsong-wt-b {
					right: ${.25 + (event.target.value - 1) * .15}em
				}
			`;
			break;
	}
}

function checkStatus(response) {
	if (response.status >= 200 && response.status < 300) {
		return response.text();
	} else {
		console.log(response);
		return Promise.reject(new Error(response.status + ": " + response.statusText));
	}
}
