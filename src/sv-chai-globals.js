/**
 * Created by Chamberlain on 8/14/2017.
 */
const chai = require('chai');
const assert = chai.assert;

const chaiG = module.exports = {
	chai: chai,
	chaiHTTP: require('chai-http'),
	request: require('request-promise'),
	mongoose: require('mongoose'),
	testUsers: {},

	showTraces: _.isTruthy($$$.env.ini.MOCHA.SHOW_TRACES),
	filterLevel: $$$.env.ini.MOCHA.FILTER_LEVEL | 0,

	catcher(done) {
		return (err) => {
			chaiG.chai.assert.ifError(err);
			done();
		}
	},

	padError(err) {
		if(!chaiG.showTraces) return;
		trace("      " + err);
	},

	makeTestUsers() {
		const User = $$$.models.User;

		chaiG.testUsers.chamberlainpi = new User({
			name: 'Pierre Chamberlain',
			username: 'chamberlainpi',
			email: 'chamberlainpi@gmail.com',
			_password: $$$.md5('pi3rr3')
		});

		chaiG.testUsers.peter = new User({
			name: 'Peter',
			username: 'Peter123',
			email: 'peter@gmail.com',
			_password: $$$.md5('PI#RR#'),
		});
	},

	randomItemSeeds(quality, affix, itemLevel, variance) {
		return {quality: quality, affix: affix, itemLevel: itemLevel, variance: variance};
	},

	makeFailAndOK(prefix) {
		var TEST_METHODS = {
			testUser: null,

			SET_USER: (method) => {
				it('/.../ SETTING USER...', () => {
					TEST_METHODS.testUser = method();
				});
			},

			SEND(url, method, body) {
				if(!TEST_METHODS.testUser) {
					return $$$.send.api(url, method, body);
				}

				return TEST_METHODS.testUser.sendAuth(url, method, body);
			},

			RESOLVE_URL(url, body) {
				var method = "get";

				if(!_.isFunction(url)) {
					var urlStr = url || '...';
					url = () => urlStr;
				}

				if(!_.isFunction(body)) {
					var str = body;
					body = () => str;
				}

				function getURL() {
					var urlStr = url();
					if(urlStr.has('::')) {
						var urlSplit = urlStr.split('::');
						method = urlSplit[0];
						urlStr = urlSplit[1];
					}

					return `/${prefix}${urlStr}`;
				}

				var paddedURL = getURL().replace(/undefined/g, '...');

				return {
					getURL: getURL,
					padded: _.padEnd(`${method}::${paddedURL}`, 30) + "> ",
					method: method,
					getBody: body
				};
			},

			OK(url, title, body, onData) {
				if(!onData) {
					onData = body;
					body = null;
				}
				const resolved = TEST_METHODS.RESOLVE_URL(url, body);

				it(resolved.padded + title, done => {
					const resolvedBody = resolved.getBody();
					TEST_METHODS.SEND(resolved.getURL(), resolved.method, resolvedBody)
						.then(data => {
							assert.exists(data);

							data.body = resolvedBody ? resolvedBody.body : null;

							// If the callback signature takes 2 arguments, assume
							// it needs the 'done' callback for asynchronous uses.
							if(onData.length===2) {
								onData(data, done);
								return;
							}

							onData(data);
							done();
						})
						.catch(err => {
							trace((`TEST.OK in '${prefix}' got an error:\n` + (err.message || err)).red);
							//trace(err.stack);
							done(err)
						});
				});
			},

			FAIL(url, title, body, giveReason) {
				const resolved = TEST_METHODS.RESOLVE_URL(url, body);

				it(resolved.padded + ('* '.red) + title, done => {
					TEST_METHODS.SEND(resolved.getURL(), resolved.method, resolved.getBody())
						.then(data => done('Should not exists!'))
						.catch(err => {
							assert.exists(err);
							done();
							if(giveReason) trace((err.message || err).toString().yellow);

						});
				});
			}
		};

		return TEST_METHODS;
	}
};