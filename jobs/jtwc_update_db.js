var jtwcActive = require('./lib/jtwc_active');
var moment = require('moment');
var mongojs = require('mongojs');
var _ = require('underscore');

var db = mongojs("admin:rLLLzgb8e8SN@127.0.0.1:27017/tc", ['jtwc_active']);
db.jtwc_active.ensureIndex( { code: 1 }, {unique: true} );

jtwcActive.getActiveStorms(function(activeStorms) {
	_.each(activeStorms, function(storm) {
		db.jtwc_active.findOne({code:storm.code}, function(err, oldStorm) {
			var pastTrack = [];
			console.log('oldStorm: ' + oldStorm);
			if (oldStorm != null) {
				pastTrack = oldStorm.pastTrack;
				if (storm.currentPos.time != oldStorm.currentPos.time) {
					pastTrack.push(oldStorm.currentPos);
				}
			}

			storm.pastTrack = pastTrack;
			storm.updateTs = moment().format('YYYYMMDDHHmmss');
			console.log(storm);

			db.jtwc_active.update(
				{ code: storm.code },
				storm,
				{ upsert: true },
				function() {
					console.log(storm.code + ' updated to db');
					db.close();
				}
			);
		});
	});
});
