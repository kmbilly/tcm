var _ 		= require('underscore');
var mongojs 	= require('mongojs');
var express	= require('express');
var logger	= require('morgan');
var ejs		= require('ejs');
var fs		= require('fs');
var app		= express();

app.set('port', process.env.OPENSHIFT_NODEJS_PORT || 8080);
app.set('ipaddr', process.env.OPENSHIFT_NODEJS_IP || "127.0.0.1");

// Setup db connection pool
var db = mongojs("mongodb://localhost/tcdb?maxPoolSize=100", ['jtwc_active']);

// Setup server shutdown handler
var shuttingDown = false;
app.use(function (req, resp, next) {
	if(!shuttingDown)
		return next();

	resp.setHeader('Connection', "close");
	resp.send(503, "Server is in the process of restarting");

	// Change the response to something your client is expecting:
	//   html, text, json, etc.
});

// Setup request logger
app.use(logger());

// Setup api route
var router = express.Router();
router.route('/active_tracks')

	.get(function(req, res) {
		db.jtwc_active.find(function(err, activeTracks) {
			if (err) {
				res.send(err);
			} else {
				res.json({storms: activeTracks});
			}
			db.close();
		});
	});

app.use('/api', router);

// Setup server side data injection to index.html
app.get('/', function(req,res) {
	db.jtwc_active.find(function(err, activeTracks) {
		var inject = {};
		var initialData = {};
		initialData.activeTracks = activeTracks;
		inject.initialData = JSON.stringify(initialData);

		var ejs_file = fs.readFileSync('./public/index.ejs', 'utf-8');
		var page_html = ejs.render(ejs_file, inject);
		res.send(page_html);
	});
});

// Setup static files
app.use(express.static(__dirname + '/public'));

var server = require('http').createServer(app);
server.listen(app.get('port'), app.get('ipaddr'), function() {
	console.log((new Date()) + ' Server is listening on port ' + app.get('port') + '...');
});

function cleanup () {
	console.log('Shutting down...');
	shutting_down = true;
	server._connections = 0;  // ensure close callback will be called
	server.close(function () {
		console.log( "Closed out remaining connections.");
		db.close();
	        process.exit();
	});

	setTimeout(function () {
		console.error("Could not close connections in time, forcing shut down");
		process.exit(1);
	}, 30*1000);

}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

