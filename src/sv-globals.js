/**
 * Created by Chamberlain on 8/10/2017.
 */
global._ = require('lodash');
require('colors');
require('../public/js/extensions');

traceClear();

const fs = require('fs-extra');
const request = require('request-promise');
const express = require('express');
const app = express();
const crypto = require('crypto');
const events = require('events');
const REGEX_ISO_MILLIS = /[0-9\.]Z$/;
const env = require('./sv-env')('./.private/env.ini');
const paths = require('./sv-paths')(env);
const mkdirp = require('mkdirp');

function createHttpOrHttps(app) {
	const HTTPS_CONFIG = env.ini.HTTPS;

	if(!HTTPS_CONFIG || !_.isTruthy(HTTPS_CONFIG.ENABLED)) {
		return require('http').createServer(app);
	}

	const https = require('https');
	const privatize = s => s.replace("~private", paths.__private);
	const keyFile = privatize(HTTPS_CONFIG.KEY_FILE);
	const certFile = privatize(HTTPS_CONFIG.CERT_FILE);
	var options;

	try {
		options = {
			key: fs.readFileSync(keyFile),
			cert: fs.readFileSync(certFile)
		};
	} catch(err) {
		traceError("=== HTTPS Enabled, but could not locate Key & Cert files... ===");
		trace(keyFile.yellow);
		trace(certFile.yellow);
		process.exit(1);
	}

	return https.createServer(options, app);
}

global.wait = function(cb) {
	process.nextTick(cb);
};

global.waitTrace = function() {
	var args = arguments;
	wait(() => {
		_.each(args, (str, i) => {
			trace(str);
		})

	});
};

_.extend( events.prototype, {
	has(eventName) {
		return this.listenerCount(eventName)>0;
	},
	onAndEmit(eventName, cb) {
		this.on(eventName, cb);
		cb(this);
	}
});

const $$$ = global.$$$ = new events();
const _slice = [].slice;

_.extend($$$, {
	isDev: _.isTruthy(env.ini.IS_DEV),
	paths: paths,
	env: env,
	app: app,
	fs: fs,
	request: request,
	express: express,
	server: createHttpOrHttps(app),

	now() {
		return new Date().toString();
	},

	randInt(range) {
		if(!range) range = 100;
		return (Math.random() * range) | 0;
	},

	nullDate() {
		const nullDate = new Date();
		nullDate.setTime(0);
		return nullDate;
	},

	md5(data) {
		if(!data) return '';
		return crypto.createHash('md5').update(data).digest("hex");
	},

	encodeToken() {
		const args = _slice.call(arguments);
		return args.join('::').toBase64();
	},

	decodeToken(str) {
		return str.fromBase64().split('::');
	},

	make: {
		routeFromModule(routePath, name) {
			const routeModule = _.isFunction(routePath) ? routePath : require(routePath);
			const route = $$$.express.Router();
			route._name = name;

			routeModule(route);

			return route;
		}
	},

	send: {
		error(res, err, data) {
			const isResOK = res.constructor.name==='ServerResponse';
			if(!isResOK) {
				var stack = new Error().stack;
				trace(err);
				throw new Error("\nYou may have mixed the 'res' arguments in the send.error call...\n".red + stack);
			}

			const errResponse = {
				url: res.req.fullURL,
				method: res.req.method,
				headers: $$$.send.makeResponseHeader(res),
				data: data,
				error: err ? (err.message || err) : '*null-error*',
				stack: _.isString(err) ? 'n/a' : err.stack
			};

			//$$$.morganLogger.error(JSON.stringify( err ));
			res.status(500).send(errResponse);
			return false;
		},

		errorSkippedRoute(res) {
			this.error(res, "Route improperly called / skipped a pre-route: " + res.req.url);
		},

		errorCustom(res, errMessage, errTitle) {
			if(!res) throw new Error("You have to pass a 'res' object to this method.");
			res.statusMessage = errTitle;
			return this.error(res, errMessage);
		},

		result(res, data) {
			res.status(200).send({
				headers: $$$.send.makeResponseHeader(res),
				data: data
			});
			return false;
		},

		api(urlEnd, method, options) {
			if(!_.isString(method) && arguments.length<3) {
				options = method;
				method = 'get';
			}

			if(!options) options = {};

			options.json = true;

			if(!options.headers) {
				options.headers = {
					'Authorization': $$$.encodeToken('sf-admin', new Date().toLocaleDateString())
				};
			}

			return request[method.toLowerCase()]($$$.paths.__api + urlEnd, options)
				.then(data => {
					if(data && data.data) {
						return data.data;
					}
					return data;
				});
		},

		makeResponseHeader(res) {
			const now = new Date();
			//const nowSecs = REGEX_ISO_MILLIS.match(now);
			return {
				responseTime: now.getTime() - res.req.dateRequested.getTime(),
				dateResponded: now.toISOString()
			};
		},

		empty(res) {
			this.result(res, {empty:true});
		},

		plainText(res, text) {
			res.send(text);
		},

		notImplemented(res) {
			this.error(res, 'Not implemented yet: ' + res.req.method);
		},
	},

	files: {
		ensureDirExists(file) {
			return new Promise((resolve, reject) => {
				var path = file.__.remove(/\/[^\/]*\.[a-z0-9]*$/i);

				mkdirp(path, err => {
					if(err) return reject(err);
					resolve();
				});
			})
		},

		read(file, cb) {
			fs.readFile(file, {encoding:'utf8'}, cb);
		},

		readJSON(file) {
			return new Promise((resolve, reject) => {
				fs.readFile(file, {encoding:'utf8'}, (err, content) => {
					if(err) return reject(err);

					try {
						var data = JSON.parse(content);
						if(data) return resolve(data);

						reject(new Error('JSON data is undefined/null: ' + data));
					} catch(jsonErr) {
						reject(jsonErr);
					}
				});
			});
		},

		writeJSON(file, json, isPretty) {
			return new Promise((resolve, reject) => {
				const jsonStr = isPretty ? JSON.stringify(json, null, '  ') : JSON.stringify(json);
				fs.writeFile(file, jsonStr, {encoding:'utf8'}, (err) => {
					if(err) return reject(err);

					resolve();
				});
			});
		},

		readDir(dir, cb) {
			dir = dir.__;

			fs.pathExists(dir)
				.then(ok => {
					if(!ok) return cb("Not found: " + dir);

					return fs.readdir(dir);
				})
				.then(files => {
					files = files
						.filter(file => !(file==='.' || file==='..'))
						.map(file => (dir+ '/' + file).__);

					cb(null, files);
				})
				.catch(err => {
					traceError(`Problem in dir: ${dir}:\n` + err.stack);
					cb(err);
				});

		},

		filter(dir, listFilters, cb) {
			if(!_.isArray(listFilters)) listFilters = [listFilters];

			var totalDone = 0;
			const results = [];
			const promises = [];

			//Correct the filters if they are strings / regexp types:
			listFilters = listFilters
				.map( (filter, id) => {
					if(_.isString(filter)) {
						//Assume it's a file-extension matcher:
						return f => f.has(filter);
					} else if(_.isRegExp(filter)) {
						return f => filter.test(f);
					} else if(_.isPromise(filter())) {
						// Determine promises ahead of time:
						promises.push(id);
					}

					return filter;
				})
				.filter( filter => _.isFunction(filter) );


			// Read the dir:
			this.readDir(dir, (err, files) => {
				if(err) return cb(err);

				totalDone = files.length;

				//Iterate each files / paths and apply the async/sync filters:
				files.forEach((file, f) => _nextFilter(file, f, 0));
			});


			// Recursive filter iterator:
			function _nextFilter(file, f, ff, data) {
				//If we made it through ALL filters (FINISH LINE!) then add this file to the results:
				if(ff >= listFilters.length) {
					results.push(file);
					return _done();
				}

				if(!data) data = file;

				const filter = listFilters[ff];

				//If this filter ID is a promise, call it as a promise:
				if(promises.has(ff)) {
					filter(file)
						.then( result => _nextFilter(file, f, ff + 1, result))
						.catch(err => {
							traceError("Problem while running $$$.files.filter in file: " + file);
							trace(err);
							_done();
						} );
				} else {
					if(filter(data)) {
						return _nextFilter(file, f, ff + 1);
					}
					_done();
				}
			}


			//Counter:
			function _done() {
				if((--totalDone)<=0) {
					var justNames = results.map(f => f.split('/').pop());
					cb(null, results, justNames);
				}
			}
		},

		dirs(dir, cb) {
			this.filter(dir, [ fs.stat, stat => stat && stat.isDirectory() ], cb);
		},

		forEachFiles(dir, filters, cbEach, cb) {
			this.filter(dir, filters, (err, files, names) => {
				if(!cb && err) throw err;

				files.forEach((file, id) => cbEach(file, names[id]));

				cb(err, files);
			});
		},

		forEachJS(dir, cbEach, cb) {
			this.forEachFiles(dir, ".js", cbEach, cb);
		}
	}
});

class DetailedError extends Error {
	constructor(msg, details) {
		super(msg);
		this.details = details;
	}
}

class Timer {
	constructor(time, loop, isStarting=false) {
		this._interval = -1;
		this._time = time;
		this._loop = loop;

		if(isStarting) this.start();
	}

	start(isTriggeredImmediately) {
		//1000 * 60
		this.stop();
		this._interval = setInterval(this._loop, this._time);
		if(isTriggeredImmediately) this._loop();
	}

	stop() {
		if(this._interval<0) return;
		clearInterval(this._interval);
		this._interval = -1;
	}
}

$$$.DetailedError = DetailedError;
$$$.Timer = Timer;