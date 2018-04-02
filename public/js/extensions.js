var GLOBALS;
if(isNode()) GLOBALS = global;
else {
	GLOBALS = window;
	if(!GLOBALS.console) GLOBALS.console = {log: function() {}};
}

function isNode() {
	return typeof module !== 'undefined' && module.exports;
}

var p = Array.prototype;

p.first = function() {
	if(this.length>0) return this[0];
	return null;
};

p.last = function() {
	if(this.length>0) return this[this.length-1];
	return null
};

p.remove = function(item) {
	var id = this.indexOf(item);
	if(id>-1) this.splice(id, 1);
	return id;
};

p.pickRandom = function() {
	var id = (Math.random() * this.length) >> 0;
	return this[id];
}

p.has = function(item) {
	return this.indexOf(item)>-1;
};

p.findOrPush = function(cb, obj) {
	let found = this.find(cb);
	if(!found) {
		this.push(obj);
		found = this.find(cb);
	}
	return found;
};

Array._map_toKeyValues = function(name,i) {
	return {value: i, name: name};
};

p.toKeyValues = function() {
	return this.map(Array._map_toKeyValues);
};

p.rotate = (function() {
	var unshift = Array.prototype.unshift,
		splice = Array.prototype.splice;

	return function(c) {
		var len = this.length >>> 0,
			count = c >> 0;

		unshift.apply(this, splice.call(this, count % len, len));
		return this;
	};
})();

p.insert = (function() {
	var splice = Array.prototype.splice;

	return function(index, items) {
		if(!_.isArray(items)) items = [items];
		splice.apply(this, [index, 0].concat(items));
		return this;
	};
})();


p.sortNumeric = (function() {
	const sortNumericFunc = (a,b) => a-b;

	return function() {
		return this.sort(sortNumericFunc);
	};
})();

/////////////////
p = String.prototype;

_.addProps = Object.defineProperties;
_.addProps(p, {
	'__': {
		get() {
			var str = this.toString().replace(/\\/g, "/");
			return str.endsWith("/") ? str.substr(0, str.length - 1) : str;
		}
	},
	'noLines': {
		get() {
			return this.split('\n').map(n => n.trim()).join(' ');
		}
	}
});

(function() {
	const _titleCaseRegex = /\w\S*/g;

	function _titleCaseReplacer(txt) {
		return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
	}

	p.titleCase = function() {
		return this.replace(_titleCaseRegex, _titleCaseReplacer);
	};

	p.has = function has(str) {
		return this.indexOf(str)>-1;
	};

	p.remove = function remove(str, all) {
		if(all===true) {
			return this.split(str).join('');
		}
		return this.replace(str, '');
	};

	p.rep = function rep(obj) {
		var regex, str = this.toString();

		if(_.isArray(obj)) {
			for(var i=obj.length; --i>=0;) {
				regex = new RegExp("\\$"+i, "g");
				str = str.replace(regex, obj[i]);
			}
		} else {
			for(var o in obj) {
				regex = new RegExp("\\$"+o, "g");
				str = str.replace(regex, obj[o]);
			}
		}

		return str;
	};

	p.toPath = function() {
		return {
			ext: this.substring(this.lastIndexOf('.')),
			path: this.substring(0, this.lastIndexOf('/')+1),
			filename: this.substring(this.lastIndexOf('/')+1, this.lastIndexOf('.'))
		}
	};

	if(!"".endsWith) {
		p.endsWith = function(searchString, position) {
			var subjectString = this.toString();
			if (typeof position !== 'number' || !isFinite(position) || Math.floor(position) !== position || position > subjectString.length) {
				position = subjectString.length;
			}
			position -= searchString.length;
			var lastIndex = subjectString.lastIndexOf(searchString, position);
			return lastIndex !== -1 && lastIndex === position;
		};
	}
})();

var regexEmoji = /:([a-z0-9\-\_ ]*):/gi;
var regexIcon = /\~([a-z0-9\-\_ ]*)\~/gi;

_.toEmoji = function toEmoji(str) {
	return str.replace(regexEmoji, '<i class="em em-$1"></i>');
};

_.toIcon = function toIcon(str) {
	return str.replace(regexIcon, '<i class="fa fa-$1"></i>')
};

_.guid = function guid() {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
		var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
		return v.toString(16);
	});
};

_.traverse = function(masterDest, masterSrc, cb) {
	function recursive(dest, src) {
		_.each(src, (value, key) => {
			var destValue = dest[key];
			if(_.isUndefined(destValue)) {
				return cb('Key does not exists on destination object: ' + key);
			}

			if(_.isArray(destValue)) {
				if(!_.isArray(value)) return cb('Incompatible value, should be Array: ' + value);
				return recursive(destValue, value);
			} else if(_.isObject(destValue)) {
				if(!_.isObject(value)) return cb('Incompatible value, should be Object: ' + value);
				return recursive(destValue, value);
			}

			if(typeof(destValue)!==typeof(value)) {
				return cb('Incompatible types for destination & source: ' + destValue + " : " + value);
			}

			cb(null, {dest: dest, src: src, key: key, type: typeof(destValue)});
		});
	}

	recursive(masterDest, masterSrc);
};

p.camelToTitleCase = function() {
	var text = this.toString();
	var result = text.replace( /([A-Z])/g, " $1" );
	return result.charAt(0).toUpperCase() + result.slice(1);
};

//////////////////////////////////////////////////////////////

Function.prototype.defer = function() {
	var _this = this, args = arguments;
	_.defer(function() { _this.apply(null, args); });
};

//////////////////////////////////////////////////////////////

_.loop = function(cb) {
	var result = {id:-1};
	function _loop() {
		var time = cb();
		if(time<=0) return;
		result.id =  setTimeout(_loop, time);
	}

	setTimeout(_loop, 0);

	return result;
};

_.isTruthy = function(bool) {
	return bool===true || bool===1 || (typeof(bool)=='string' && "true,1,on,yes".has(bool.toLowerCase()));
};

_.isNullOrEmpty = function(prop) {
	if(!prop) return true;
	if(prop.hasOwnProperty('length')) return !prop.length;
	return false
};

_.isPromise = function(prop) {
	if(prop && prop.then && prop.catch) {
		prop.catch(err => {}); //Dont't worry about it!
		return true;
	}
	return false;
};

_.mapRename = function(obj, filter) {
	var newObj = {};
	_.mapObject(obj, (val, key) => {
		newObj[filter(key)] = val;
	});
	return newObj;
};

_.jsonClone = function(data, times) {
	var str = JSON.stringify(data);
	if(times==null) return JSON.parse(str);
	var results = [];
	while(--times>=0) {
		results.push(JSON.parse(str));
	}

	return results;
};

_.jsonPretty = function(obj, indent) {
	if(!indent) indent = 2;

	return JSON.stringify(obj, function(k,v) {
		//Check if this is a leaf-object with no child Arrays or Objects:
		for(var p in v) {
			if(_.isArray(v[p]) || _.isObject(v[p])) {
				return v;
			}
		}

		return JSON.stringify(v);

		//Cleanup the escaped strings mess the above generated:
	}, indent).replace(/\\/g, '')
		.replace(/\"\[/g, '[')
		.replace(/\]\"/g,']')
		.replace(/\"\{/g, '{')
		.replace(/\}\"/g,'}')
		.replace(/"true"/g, 'true')
		.replace(/"false"/g, 'false');
};

_.jsonFixBooleans = function(obj) {

	fixBool(obj);

	function fixBool(current) {
		_.keys(current).forEach(key => {
			var value = current[key];
			if(value==="true") current[key] = true;
			else if(value==="false") current[key] = false;
			else if(_.isObject(value)) fixBool(value);
		});
	}
};

_.omit = function(obj, blacklist) {
	var iterator = key => key.startsWith('_');

	if(_.isFunction(blacklist)) {
		iterator = key => blacklist(key);
	} else if(!_.isNullOrEmpty(blacklist)) {
		if(_.isString(blacklist)) blacklist = blacklist.split(',');

		iterator = key => blacklist.has(key.toLowerCase());
	}

	var newObj = {};

	_.keys(obj).forEach(key => {
		if(iterator(key)) return;

		newObj[key] = obj[key];
	});

	return newObj;
};

_.promise = function prom(cbErrorOrPromise) {
	return new Promise((resolve, reject) => {
		var result = cbErrorOrPromise();
		resolve(result);
	})
};

_.makeToken = function makeToken() {
	var args = [].slice.call(arguments);
	return args.join('::').toBase64();
};

function genericError(err, url, title, msg) {
	var error = err.responseText;
	try {
		error = JSON.parse(err.responseText);
	} catch(jsonErr) {}

    var errorMessage = error.error || error.message || error;

	traceError(errorMessage);

	_.alert( title, msg + `at URL: <br/>${url}<br/><b>Reason:</b><br/><i class="red">${errorMessage}</i>` );
}

_.loadJSON = function loadJSON(url) {
	return new Promise((resolve, reject) => {
		$.get({
			url: url,
			success(data) {
				resolve(data);
			},
			error(err) {
				genericError(
					err, url,
					'JSON Load Error', `Could not load the JSON data`
				);

				reject(err);
			}
		});
	});
};

_.writeJSON = function loadJSON(url, data) {
	return new Promise((resolve, reject) => {
		$.post({
			url: url,
			data: JSON.stringify(data),
			contentType: "application/json; charset=utf-8",
			dataType   : "json",
			success(data) {
				resolve(data);
			},
			error(err) {
				genericError(
					err, url,
					'JSON Write Error', `Could not write the JSON data`
				);

				reject(err);
			}
		});
	});
};

_.alert = function(title, message) {
	$.alert({title: title, content: message});
};

function AsyncEach(objList, funcList, cb) {
	this.objList = objList;
	this.funcList = _.isArray(funcList) ? funcList : [funcList];
	this.cb = cb;
	this._objID = -1;
	this._obj = null;
	this._funcID = -1;

	this._nextObj = this.nextObj.bind(this);
	this._nextFunc = this.nextFunc.bind(this);

	setTimeout(this._nextObj, 1);
}

_.extend(AsyncEach.prototype, {
	nextObj() {
		if((++this._objID) >= this.objList.length) {
			return this.cb();
		}

		this._obj = this.objList[this._objID];

		//Reset the callback ID before we start iterating on each one:
		this._funcID = -1;
		this._nextFunc();
	},

	nextFunc() {
		if((++this._funcID) >= this.funcList.length) {
			return this._nextObj();
		}

		var func = this.funcList[this._funcID];

		func(this._nextFunc, this._obj, this._objID);
	}
});

AsyncEach.make = function(arr, onDone, onEach) {
	new AsyncEach(arr, onDone, onEach);
};

GLOBALS.AsyncEach = AsyncEach;

//////////////////////////////////////////////////////////////

function TimedDirtyFlag(params) {
	if(!params) throw 'TimedDirtyFlag needs a params object';
	if(!params.onDirty) throw 'TimedDirtyFlag needs an "onDirty" callback.';
	if(!params.secondsInterval) throw 'TimedDirtyFlag needs a "secondsInterval" time (in seconds).';
	this.params = params;
	this.isDirty = false;
	this.time = params.secondsInterval * 1000;
	this.id = -1;

	this.start();
}

_.extend(TimedDirtyFlag.prototype, {
	stop() {
		var self = this;
		if(self.id>0) clearTimeout(self.id);
		self.id = -1;
		self.isRunning = true;
	},

	start() {
		var self = this;
		self.isRunning = true;

		if(!self.params.skipFirst) {
			return self.loopCheck();
		}

		self.id = setTimeout(function() { self.loopCheck(); }, self.time);
	},

	loopCheck() {
		var self = this;
		if(!self.isRunning) return;

		if(self.isDirty) {
			self.isDirty = false;
			self.params.onDirty();
		}

		self.id = setTimeout(function() { self.loopCheck(); }, self.time);
	}
});


GLOBALS.TimedDirtyFlag = TimedDirtyFlag;

//////////////////////////////////////////////////////////////

if(!console) {
	console = { log() {}, error() {}, clear() {}, }
}

GLOBALS.trace = console.log.bind(console);
GLOBALS.traceObj = function(o) {
	var output = _.keys(o).sort();
	trace(output);
	return output;
};

GLOBALS.trace.makeLogger = function(prefix, css) {
	if(!css) css = "background: #888; color: #fff; padding: 0px 3px;";
	if(css.startsWith('#')) css = "color: " + css;

	return function(obj) {
		trace('%c' + prefix +":", css, obj);
	};
};

if(isNode()) {
	GLOBALS.traceClear = function() { process.stdout.write('\033c'); };
	GLOBALS.traceError = function(err) { trace(err.toString().red); };

	module.exports = GLOBALS;

	_.extend(String.prototype, {
		toBase64() {
			return new Buffer(this.toString()).toString('base64');
		},
		fromBase64() {
			return new Buffer(this.toString(), 'base64').toString('ascii');
		}
	});
} else {
	GLOBALS.traceClear = console.clear.bind(console);
	GLOBALS.traceError = console.error.bind(console);

	_.extend(String.prototype, {
		toBase64() {
			return btoa(this.toString());
		},
		fromBase64() {
			return atob(this.toString());
		}
	});
}

GLOBALS.traceProps = function(obj, pattern) {
	if(!obj) return trace('*null-props*');
	var keys = _.keys(obj);
	if(pattern) keys = keys.filter(key => pattern.test(key));
	trace(keys.sort());
};