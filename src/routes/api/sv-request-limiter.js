/**
 * Created by Chamberlain on 8/22/2017.
 */

const morganLogger = $$$.morganLogger = require($$$.paths.__src + '/sv-setup-morgan-logger');
const activeRequests = [];
const INI = $$$.env.ini;
const CONFIG = INI.REQUEST_LIMITER;
var DEFAULTS = {limit: CONFIG.LIMIT || 15, cap: CONFIG.CAP || 20, isLogged: true};
trace("Request limiter: ".yellow + _.jsonPretty(DEFAULTS));

const MODULE = {
	isTooMuch(req) {
		//When testing, never have too much requests:
		if($$$.env.isTesting) return false;

		const entry = activeRequests.find(r => r.ip === req.ip);

		if (!entry) {
			activeRequests.push({ip: req.ip, numRequests: 1, maxRequest: 1, isLimited: false});
			return false;
		}

		entry.numRequests = Math.min(DEFAULTS.cap, entry.numRequests + 1);

		if(entry.numRequests > entry.maxRequest) entry.maxRequest = entry.numRequests;

		if (entry.numRequests > DEFAULTS.limit) {
			entry.isLimited = true;
			morganLogger.error(`Limiting Requests for {IP: ${entry.ip}, Max-Reached: ${entry.maxRequest}}`);
			return true;
		}

		return false;
	},

	loop() {
		// Iterate through the active requests in REVERSE order
		// (because this for-loop MAY REMOVE them from the array)

		for(var a=activeRequests.length; --a>=0;) {
			var entry = activeRequests[a];

			if((--entry.numRequests)>0) continue;

			if(DEFAULTS.isLogged && entry.isLimited) {
				morganLogger.warn(`Released request count on {IP: ${entry.ip}, Max-Reached: ${entry.maxRequest}}`);
			}

			activeRequests.splice(a, 1);
		}
	}
};

module.exports = function(config) {
	if(!config) config = {};

	DEFAULTS = _.extend(DEFAULTS, config);

	return MODULE;
};

var loopID = setInterval(MODULE.loop, CONFIG.INTERVAL_MS);