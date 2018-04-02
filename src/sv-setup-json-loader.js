/**
 * Created by Chamberlain on 8/28/2017.
 */

const request = require('request');
const Events = require('events');

class JSONLoader extends Events {
	constructor() {
		super();
		this.options = null;
	}

	config(options) {
		this.options = options = options || {};
		if (!options.url) throw new Error("Must provide a URL to JSONLoader.");
		if (!options.app) throw new Error("Must provide an express 'app' to get JSON reload triggers.");
		return this.loadJSON();
	}

	loadJSON(url) {
		if(!url) url = this.options.url;

		return $$$.request.get(url, {json: true})
			.then(json => {
				return this.onDataLoaded(json)
			})
			.catch(err => {
				traceError("JSONLoader error!");
				trace(err);
			});
	}

	onDataLoaded(json) {
		return new Promise((resolve, reject) => {
			var temp = JSON.stringify(json);
			this.data = JSON.parse(temp, this.fixParsingIssues);
			this.dateLoaded = new Date();

			if(this.options.isParseGlobals) {
				this.parseGlobals(json);
			}

			resolve(this);

			this.emit('json-reloaded', this);
		});
	}

	fixParsingIssues(key, value) {
		if (typeof value !== 'string') return value;
		var toUpper = value.toUpperCase();

		if(key.startsWith('is-')) {
			return toUpper==='TRUE';
		}

		return value;
	}

	parseGlobals(json) {
		const globs = {};
		const sheet = json.sheets.globals;
		const headers = sheet.headers;
		const data = sheet.data;

		const propToCheck = headers[0];
		for(var h=1; h<headers.length; h++) {
			const presetName = headers[h];
			const preset = globs[presetName] = {};

			data.forEach(row => {
				var prop = row[propToCheck];
				var value = row[presetName];

				if(!isNaN(value)) value = parseFloat(value);

				preset[prop] = value;
			});
		}

		this.globals = globs;
	}
}

module.exports = JSONLoader;