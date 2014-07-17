var View     = require('./view'),
    template = require('./templates/map')
    mapStyles = require('./map_styles')

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
        var coordinates, track;
	_.each(storms, function(storm) {
		coordinates = [];
		_.each(storm.pastTrack, function(pos) {
			coordinates.push(new google.maps.LatLng(Number(pos.lat), Number(pos.lng)));
		});
		coordinates.push(new google.maps.LatLng(Number(storm.currentPos.lat),Number(storm.currentPos.lng)));
		track = new google.maps.Polyline({
		    path: coordinates,
		    geodesic: true,
		    strokeColor: '#FF0000',
		    strokeOpacity: 1.0,
		    strokeWeight: 2
		});
		track.setMap(map);
		
		coordinates = [];
		coordinates.push(new google.maps.LatLng(Number(storm.currentPos.lat),Number(storm.currentPos.lng)));
		_.each(storm.forecastTrack, function(pos) {
			coordinates.push(new google.maps.LatLng(Number(pos.lat), Number(pos.lng)));
		});
		track = new google.maps.Polyline({
		    path: coordinates,
		    geodesic: true,
		    strokeColor: '#FF0000',
		    strokeOpacity: 0.8,
		    strokeWeight: 1
		});
		track.setMap(map);
	});
    }
})
