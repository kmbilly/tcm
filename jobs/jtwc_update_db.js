var moment 	= require('moment');
var mongojs 	= require('mongojs');
var jtwcActive 	= require('./lib/jtwc_active');
var logger 	= require('./lib/logger');
var _ 		= require('underscore');

logger.info('Start JTWC update job...');

// Setup db connection pool
var connection_string = 'mongodb://localhost/tcdb?maxPoolSize=100';
if (process.env.OPENSHIFT_MONGODB_DB_PASSWORD) {
        connection_string = process.env.OPENSHIFT_MONGODB_DB_USERNAME + ":" +
		process.env.OPENSHIFT_MONGODB_DB_PASSWORD + "@" +
		process.env.OPENSHIFT_MONGODB_DB_HOST + ':' +
		process.env.OPENSHIFT_MONGODB_DB_PORT + '/' +
		process.env.OPENSHIFT_APP_NAME;
}
var db = mongojs(connection_string, ['jtwc_active']);

db.jtwc_active.ensureIndex( { code: 1 }, {unique: true} );

jtwcActive.getActiveStorms(function(activeStorms) {
	var updateCount = 0;
	_.each(activeStorms, function(storm) {
		db.jtwc_active.findOne({code:storm.code}, function(err, oldStorm) {
			var pastTrack = [];
			if (oldStorm != null) {
				pastTrack = oldStorm.pastTrack;
				if (storm.currentPos.time != oldStorm.currentPos.time) {
					pastTrack.push(oldStorm.currentPos);
				}
			}

			storm.pastTrack = pastTrack;
			storm.updateTs = moment().format('YYYYMMDDHHmmss');
			logger.info('Parsed storm: ' + storm);

			db.jtwc_active.update(
				{ code: storm.code },
				storm,
				{ upsert: true },
				function() {
					logger.info(storm.code + ' updated to db');

					++updateCount;
					if (updateCount == activeStorms.length) {
						db.close();
						logger.info('Finished JTWC update job');
					}
				}
			);

		});
	});
});
