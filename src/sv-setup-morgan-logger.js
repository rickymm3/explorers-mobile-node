/**
 * Created by Chamberlain on 8/23/2017.
 */

const fs = require('fs');
const morgan = require('morgan');
const path = require('path');
const rfs = require('rotating-file-stream');
const EOL = require('os').EOL;

function createLog(filename) {
	return rfs(filename, {
		size:     '10M',	// rotate every 10 MegaBytes written
		interval: '1d', 	// rotate daily
		compress: 'gzip',	// compress rotated files
		path: $$$.paths.__private + '/logs/'
	})
}

const morganStream = createLog('morgan.log');
const errorStream = createLog('errors.log');

module.exports = {
	_morgan: morgan,
	_morganStream: morganStream,
	_errorStream: errorStream,

	_write(msg) { errorStream.write(msg + EOL); },
	error(msg) { this._write("ERROR: " + msg); },
	warn(msg) { this._write("WARN: " + msg); },
	info(msg) { this._write("INFO: " + msg); },

	setupLogger(app) {
		if(!_.isTruthy($$$.env.ini.MORGAN.ENABLED)) return;

		trace("MORGAN setup: ".yellow + "initialized.");

		morgan.token('padded-time', function(req, res, digits) {
			if(!digits) digits = 10;
			const time = this['response-time'](req, res) + ' ms';
			return _.padStart(time, digits, '_');
		});

		morgan.token('is-error', function(req, res) {
			if(res.statusCode<200) return ' ';
			return `*ERROR* ${res.statusCode} - ${res.statusMessage}`;
		});


		const skipFunc = _.isTruthy($$$.env.ini.MORGAN.ERRORS_ONLY) ?
							(req, res) => res.statusCode<400 :
							null;

		const morganRoute = morgan([
				':date[iso]',
				'FROM: :remote-addr',
				'TIME: :padded-time',
				'URL: :url [:method] :is-error',
				'AUTH: :req[authorization]',
			].join('  '),
			{
				stream: morganStream,
				skip: skipFunc
			}
		);

		app.use(morganRoute);
	}
};

