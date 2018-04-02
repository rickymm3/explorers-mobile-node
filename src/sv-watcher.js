/**
 * Created by Chamberlain on 10/27/2017.
 */

const chokidar = require('chokidar');
const anymatch = require('anymatch');
const watchers = [];

const config = {
	ignored: [
		/(^|[\/\\])\../, '**/node_modules'
	]
};

const callback = (event, path) => {
	path = path.__;

	watchers.forEach(w => {
		var isEventOK = w.event==='*' || w.event===event;
		if(!isEventOK || !w.matcher(path)) return;
		w.cb(path);
	});
};

function setupWatcher() {
	trace("FILE-WATCHER: ".yellow + "Init.");
	$$$.watcher = chokidar.watch('.', config);
	$$$.watcher.on('all', callback);

	$$$.addWatcher = function(pattern, event, cb) {
		if(arguments.length===2) {
			cb = event;
			event = 'change'
		}

		watchers.push({matcher: anymatch(pattern), event: event, cb: cb})
	};

	$$$.addWatcher('src/**', path => {
		trace("SRC FILE CHANGED: ".red + path);
		process.kill(process.pid);
	})
}

module.exports = setupWatcher;
