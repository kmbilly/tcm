(function(/*! Brunch !*/) {
  'use strict';

  var globals = typeof window !== 'undefined' ? window : global;
  if (typeof globals.require === 'function') return;

  var modules = {};
  var cache = {};

  var has = function(object, name) {
    return ({}).hasOwnProperty.call(object, name);
  };

  var expand = function(root, name) {
    var results = [], parts, part;
    if (/^\.\.?(\/|$)/.test(name)) {
      parts = [root, name].join('/').split('/');
    } else {
      parts = name.split('/');
    }
    for (var i = 0, length = parts.length; i < length; i++) {
      part = parts[i];
      if (part === '..') {
        results.pop();
      } else if (part !== '.' && part !== '') {
        results.push(part);
      }
    }
    return results.join('/');
  };

  var dirname = function(path) {
    return path.split('/').slice(0, -1).join('/');
  };

  var localRequire = function(path) {
    return function(name) {
      var dir = dirname(path);
      var absolute = expand(dir, name);
      return globals.require(absolute, path);
    };
  };

  var initModule = function(name, definition) {
    var module = {id: name, exports: {}};
    cache[name] = module;
    definition(module.exports, localRequire(name), module);
    return module.exports;
  };

  var require = function(name, loaderPath) {
    var path = expand(name, '.');
    if (loaderPath == null) loaderPath = '/';

    if (has(cache, path)) return cache[path].exports;
    if (has(modules, path)) return initModule(path, modules[path]);

    var dirIndex = expand(path, './index');
    if (has(cache, dirIndex)) return cache[dirIndex].exports;
    if (has(modules, dirIndex)) return initModule(dirIndex, modules[dirIndex]);

    throw new Error('Cannot find module "' + name + '" from '+ '"' + loaderPath + '"');
  };

  var define = function(bundle, fn) {
    if (typeof bundle === 'object') {
      for (var key in bundle) {
        if (has(bundle, key)) {
          modules[key] = bundle[key];
        }
      }
    } else {
      modules[bundle] = fn;
    }
  };

  var list = function() {
    var result = [];
    for (var item in modules) {
      if (has(modules, item)) {
        result.push(item);
      }
    }
    return result;
  };

  globals.require = require;
  globals.require.define = define;
  globals.require.register = define;
  globals.require.list = list;
  globals.require.brunch = true;
})();
require.register("application", function(exports, require, module) {
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

});

;require.register("initialize", function(exports, require, module) {
var application = require('application')

$(function() {
    application.initialize()
    Backbone.history.start()
})

});

;require.register("lib/router", function(exports, require, module) {
var application = require('application')

module.exports = Backbone.Router.extend({
    routes: {
        '': 'map'
    },
    
    map: function() {
        $('body').html(application.mapView.render().el)
    }
})

});

;require.register("lib/view_helper", function(exports, require, module) {
// Put handlebars.js helpers here

});

;require.register("models/collection", function(exports, require, module) {
// Base class for all collections
module.exports = Backbone.Collection.extend({
    
})

});

;require.register("models/model", function(exports, require, module) {
// Base class for all models
module.exports = Backbone.Model.extend({
    
})

});

;require.register("views/map_styles", function(exports, require, module) {
module.exports = {
	neutralBlue: [{"featureType":"water","elementType":"geometry","stylers":[{"color":"#193341"}]},{"featureType":"landscape","elementType":"geometry","stylers":[{"color":"#2c5a71"}]},{"featureType":"road","elementType":"geometry","stylers":[{"color":"#29768a"},{"lightness":-37}]},{"featureType":"poi","elementType":"geometry","stylers":[{"color":"#406d80"}]},{"featureType":"transit","elementType":"geometry","stylers":[{"color":"#406d80"}]},{"elementType":"labels.text.stroke","stylers":[{"visibility":"on"},{"color":"#3e606f"},{"weight":2},{"gamma":0.84}]},{"elementType":"labels.text.fill","stylers":[{"color":"#ffffff"}]},{"featureType":"administrative","elementType":"geometry","stylers":[{"weight":0.6},{"color":"#1a3541"}]},{"elementType":"labels.icon","stylers":[{"visibility":"off"}]},{"featureType":"poi.park","elementType":"geometry","stylers":[{"color":"#2c5a71"}]}]
}

});

;require.register("views/map_view", function(exports, require, module) {
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

});

;require.register("views/templates/map", function(exports, require, module) {
var __templateData = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  


  return "<div></div>\r\n";
  });
if (typeof define === 'function' && define.amd) {
  define([], function() {
    return __templateData;
  });
} else if (typeof module === 'object' && module && module.exports) {
  module.exports = __templateData;
} else {
  __templateData;
}
});

;require.register("views/view", function(exports, require, module) {
require('lib/view_helper')

// Base class for all views
module.exports = Backbone.View.extend({
    
    initialize: function(){
        this.render = _.bind(this.render, this)
    },
    
    template: function(){},
    getRenderData: function(){},
    
    render: function(){
        this.$el.html(this.template(this.getRenderData()))

        this.afterRender()
        return this
    },
    
    afterRender: function(){}
    
})

});

;
//# sourceMappingURL=app.js.map