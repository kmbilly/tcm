// Application bootstrapper.
Application = {
    initialize: function() {
        var ActiveTracks = Backbone.Model.extend({url: '/api/active_tracks'});
	var activeTracks = new ActiveTracks({storms: window.initialData.activeTracks});

        var MapView = require('views/map_view')
          , Router   = require('lib/router')
        
        this.mapView = new MapView({model: activeTracks});
        this.router   = new Router()
        
        if (typeof Object.freeze === 'function') Object.freeze(this)
        
    }
}

module.exports = Application
