var application = require('application')

module.exports = Backbone.Router.extend({
    routes: {
        '': 'map'
    },
    
    map: function() {
        $('body').html(application.mapView.render().el)
    }
})
