var util = require('util');
var http = require("http");
var mongojs = require('mongojs');
var moment = require("moment");
var $ = require('cheerio');
var _ = require('underscore');

var proxyHost = process.env.PROXY_HOST || null;
var proxyPort = process.env.PROXY_PORT || 0;
console.log(process.env.PROXY_HOST);

exports.getActiveStorms = getActiveStorms;

function getActiveStorms(resultCb) {
	var activeStorms = [];
	getWarnURLs(function(warnURLs) {
		var finishCnt = 0;
		_.each(warnURLs, function(warnURL) {
			var storms;
			download(httpGetOptions(warnURL), function(warnText) {
				activeStorms = activeStorms.concat(parseStorms(warnText));
				finishCnt++;

				if (finishCnt == warnURLs.length) {
					resultCb(activeStorms);
				}
			});
		});
	});
}

// Models ---------------
function Storm(code, name) {
	this.code = code;
	this.name = name;
	this.currentPos = null;
	this.pastTrack = [];
	this.forecastTrack = [];
}

function TrackPos(time, lat, lng) {
	this.time = time;
	this.lat = lat;
	this.lng = lng;
	this.centerWind = -1;
	this.centerGusts = -1;
	this.windRadius = [];
}

function WindRadius(speed, ne, se, sw, nw) {
	this.speed = speed;
	this.radius = [ne, se, sw, nw];
}

// Parsing functions --------------
function parseStorms(warnText) {
	var storms = [];
	var i = 1, isLast = false, stormStart, stormEnd;
	do {
		stormStart = warnText.indexOf('\n' + i + '.');
		stormEnd = warnText.indexOf('\n' + (i+1) + ".");
		if (stormEnd == -1) {
			isLast = true;
			stormEnd = warnText.length;
		}

		if (stormStart == -1) {
			isLast = true;
		} else {
			// Parse storm info
			var stormText = warnText.substring(stormStart+1, stormEnd);
			var storm = parseStorm(stormText);
			if (storm != null && storm.code != null) {
				storms.push(storm);
			}
		}
		++i;
	} while(!isLast);

	return storms;
}

function parseStorm(stormText) {
	var storm;
	var firstLine = stormText.substring(0, lineEnd(stormText, 0));
	var nameRe = /(\d\dW) \(([^\)]*)\)/;
	var match = nameRe.exec(firstLine);
	if (match != null && match.length >= 3) {
		storm = new Storm(match[1], match[2]);
	} else {
		storm = new Storm();
	}

	var forecastStart = stormText.indexOf('FORECASTS:');
	storm.currentPos = parseTrackPos(stormText.substring(0, forecastStart));

	var trackPosStart = forecastStart;
	var trackPosEnd, trackPos;
	do {
		trackPosEnd = stormText.indexOf('    ---', trackPosStart);
		if (trackPosEnd >= 0) {
			trackPos = parseTrackPos(stormText.substring(trackPosStart, trackPosEnd));
			if (trackPos != null) {
				storm.forecastTrack.push(trackPos);
			}
		}
		trackPosStart = trackPosEnd+7;
	} while(trackPosEnd >= 0);

	return storm;
}


function parseTrackPos(posInfoText) {
	var trackPos = null;
	var latLngRe = /([0-9]*)Z --- [^0-9.]*([0-9.]*)N ([0-9.]*)E/;
	var posMatch = latLngRe.exec(posInfoText);
	if (posMatch != null && posMatch.length >= 4) {
		trackPos = new TrackPos(toHKT(posMatch[1]), posMatch[2], posMatch[3]);

		var windRe = /([0-9]*) KT, GUSTS ([0-9]*) KT/;
		var windMatch = windRe.exec(posInfoText);
		if (windMatch != null && windMatch.length >= 3) {
			trackPos.centerWind = oneMinKnot2TenMinKMPerH(Number(windMatch[1])).toFixed(2);
			trackPos.centerGusts = knot2KMPerH(Number(windMatch[2])).toFixed(2);
		}

		var windRadiusRe = /RADIUS OF ([0-9]+) KT WINDS - ([0-9]+) NM NORTHEAST QUADRANT[\s]*([0-9]+) NM SOUTHEAST QUADRANT[\s]*([0-9]+) NM SOUTHWEST QUADRANT[\s]*([0-9]+) NM NORTHWEST QUADRANT/g;
		var windRadiusMatch = windRadiusRe.exec(posInfoText);
		while (windRadiusMatch != null && windRadiusMatch.length >= 6) {
			trackPos.windRadius.push(new WindRadius(
				knot2KMPerH(Number(windRadiusMatch[1])).toFixed(2), 
				nm2KM(Number(windRadiusMatch[2])).toFixed(2), 
				nm2KM(Number(windRadiusMatch[3])).toFixed(2), 
				nm2KM(Number(windRadiusMatch[4])).toFixed(2), 
				nm2KM(Number(windRadiusMatch[5])).toFixed(2)
			));
			windRadiusMatch = windRadiusRe.exec(posInfoText);
		}
	}

	return trackPos;
}

// Misc functions ------------------

// Return index of the next newline
function lineEnd(text, start) {
	var newline = text.indexOf('\n', start);
	if (newline == -1) {
		newline = text.length;
	}

	return newline;
}

function toHKT(jtwcTime) {
	var nowGmtYearMth = moment().subtract('hours', 8).format('YYYYMM');
	return moment(nowGmtYearMth + jtwcTime, 'YYYYMMDDHHmm').add('hours', 8).format('YYYYMMDDHHmm');
}

function oneMinKnot2TenMinKMPerH(oneMinKnot) {
	// Convertion from 1-min to 10-min wind speed (0.93) referenced from https://www.wmo.int/pages/prog/www/tcp/documents/Doc6_OPPlan_ADD-1.doc
	return knot2KMPerH(oneMinKnot * 0.93);
}

function knot2KMPerH(knot) {
	return knot * 1.852;
}

function nm2KM(nm) {
	return nm * 1.852;
}

function getWarnURLs(cb) {
	var options = {
		host: proxyHost,
		port: proxyPort,
		path: "http://www.usno.navy.mil/JTWC/",
		headers: {
			Host: "www.usno.navy.mil"
		}
	};

	download(options, function(html) {
		var urls = [];
		if (html) {
			$("a:contains('TC Warning Text')", 'li', html).each(function(i, elem) {
				urls.push($(this).attr('href'));
				console.log($(this).attr('href'));
			});
		}
		else console.log("error");  

		cb(urls);
	});
}

function download(url, callback) {
	var options;
	if (proxyHost != null) {
		options = {
			host: proxyHost,
			port: proxyPort,
			path: url,
			headers: {
				Host: require('url').parse(url).host
			}
		};
	} else {
		options = url;
	}
	http.get(options, function(res) {
		var data = "";
		res.on('data', function (chunk) {
			data += chunk;
		});
		res.on("end", function() {
			callback(data);
		});
	}).on("error", function() {
		callback(null);
	});
}

function printJson(json) {
	console.log(util.inspect(json, {depth:null}));
}
