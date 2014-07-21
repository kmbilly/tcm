var winston = require('winston');

var logger = new (winston.Logger)({
	transports: [
		new (winston.transports.Console)(),
		new (winston.transports.File)({ filename: require.main.filename + '.log', handleExceptions: true })
	]
});


module.exports = logger;
