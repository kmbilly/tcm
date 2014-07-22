var View     = require('./view'),
    template = require('./templates/map')
    mapStyles = require('./map_styles')
    TextOverlay = require('../lib/maplabel');
    stormMeta = require('../lib/storm_meta');

module.exports = View.extend({
    id: 'map-view',
    template: template,
    map: null,
    initialize: function() {
    	View.prototype.initialize.call(this);
    },
    afterRender: function() {
    	this.initMap();
	this.drawTracks(this.model.get('storms'));
    },
    initMap: function() {
        var mapOptions = {
            center: new google.maps.LatLng(17.43, 117.25),
            zoom: 6,
            mapTypeId: google.maps.MapTypeId.ROAD,
            panControl: false,
            zoomControl: true,
            mapTypeControl: false,
            scaleControl: false,
            streetViewControl: false,
            overviewMapControl: false,
	    styles: mapStyles.neutralBlue
        };

        map = new google.maps.Map(this.el, mapOptions);
    },
    drawTracks: function(storms) {
        var track;
	var strengthColor = ['#000000', '#009900', '#0000FF', '#FF0000', '#FF96C8', '#8C1E78'];
	_.each(storms, function(storm) {
		for (var i=0; i<storm.pastTrack.length; ++i) {
			var startPt = storm.pastTrack[i];
			var endPt;
			if (i < storm.pastTrack.length-1) {
				endPt = storm.pastTrack[i+1];
			} else {
				endPt = storm.currentPos;
			}

			var linePath = [
				new google.maps.LatLng(Number(startPt.lat), Number(startPt.lng)),
				new google.maps.LatLng(Number(endPt.lat), Number(endPt.lng))
			];
			track = new google.maps.Polyline({
			    path: linePath,
			    geodesic: true,
			    strokeColor: strengthColor[this.getStrength(Number(startPt.centerWind))],
			    strokeOpacity: 0.8,
			    strokeWeight: 2
			});
			track.setMap(map);
		}
		
		var dashedLineSymbol = {
			path: 'M 0,-2 0,2',
		        strokeOpacity: 0.8,
			scale: 2
		};
		for (var i=1; i<storm.forecastTrack.length; ++i) {
			var startPt;
			if (i == 1) {
				startPt = storm.currentPos;
			} else {
				startPt = storm.forecastTrack[i-1];
			}
			var endPt = storm.forecastTrack[i];
			var linePath = [
			        new google.maps.LatLng(Number(startPt.lat), Number(startPt.lng)),
				new google.maps.LatLng(Number(endPt.lat), Number(endPt.lng))
			];
			track = new google.maps.Polyline({
			    path: linePath,
			    geodesic: true,
			    strokeOpacity: 0,
			    strokeColor: strengthColor[this.getStrength(Number(startPt.centerWind))],
			    strokeWeight: 2,
			    icons: [{
				icon: dashedLineSymbol,
				offset: '0',
				repeat: '20px'
			    }]
			});
			track.setMap(map);
		}

		var stormNameOverlay = new TextOverlay({
			text: stormMeta.stormTcName[storm.name.toLowerCase()] || storm.name,
			position: new google.maps.LatLng(Number(storm.currentPos.lat), Number(storm.currentPos.lng)),
			map: map,
			fontSize: 18,
			fontFamily: 'Arial, "文泉驛正黑", "WenQuanYi Zen Hei", "儷黑 Pro", "LiHei Pro", "微軟正黑體", "Microsoft JhengHei", sans-serif',
			align: 'left',
			strokeWeight: 3,
			fontColor: '#FFFFFF',
			strokeColor: '#000000'
		});
	}, this);
    },
    getStrength: function(centerSpeed) {
	if (centerSpeed >= 185) {
		return 5;
	} else if (centerSpeed >= 150) {
		return 4;
	} else if (centerSpeed >= 118) {
		return 3;
	} else if (centerSpeed >= 88) {
		return 2;
	} else if (centerSpeed >= 63) {
		return 1;
	} else {
		return 0;
	}
    }
})
