/**
 * Created by Chamberlain on 8/14/2017.
 */
const chaiG = require('../sv-chai-globals');

const assert = chaiG.chai.assert;
const catcher = chaiG.catcher;
const testUsers = chaiG.testUsers;
const User = $$$.models.User;
const PRIVATE = $$$.env.ini.PRIVATE;
const sendAPI = $$$.send.api;

describe('=REST= User-Restricted actions', () => {
	var chamberlainpi;

	it('Login chamberlainpi...', done => {
		chamberlainpi = testUsers.chamberlainpi;

		chamberlainpi.sendLogin()
			.then(() => done());
	});

	if(chaiG.filterLevel < 10) return;

	it('Test User-Restricted call [FAIL EMPTY]', done => {
		sendAPI('/user/test-echo', 'post', {headers:{Authorization:'???'}})
			.then(data => {
				assert.notExists(data);
				done();
			})
			.catch(err => {
				chaiG.padError(err.message.yellow);
				assert.exists(err);
				done();
			});

	});

	it('Test User-Restricted call [FAIL MISSING username & token]', done => {
		sendAPI('/user/test-echo', 'post', {
			headers: {'Authorization': $$$.encodeToken(PRIVATE.AUTH_CODE)},
			body: { foo: 'bar' }
		})
			.then(data => {
				assert.notExists(data);
				done();
			})
			.catch(err => {
				chaiG.padError(err.message.yellow);
				assert.exists(err);
				done();
			});

	});

	it('Test User-Restricted call [FAIL BAD username]', done => {
		sendAPI('/user/test-echo', 'post', {
			headers: {'Authorization': $$$.encodeToken(PRIVATE.AUTH_CODE, "???", "???")},
			body: { foo: 'bar' }
		})
			.then(data => {
				assert.notExists(data);
				done();
			})
			.catch(err => {
				chaiG.padError(err.message.yellow);
				assert.exists(err);
				done();
			});

	});

	it('Test User-Restricted call [FAIL Logged Out]', done => {
		assert.notExists(chamberlainpi.login.token);

		sendAPI('/user/test-echo', 'post', {
			headers: {'Authorization': $$$.encodeToken(PRIVATE.AUTH_CODE, chamberlainpi.username, chamberlainpi.login.token)},
			body: { foo: 'bar' }
		})
			.then(data => {
				assert.notExists(data);
				done();
			})
			.catch(err => {
				chaiG.padError(err.message.yellow);
				assert.exists(err);
				done();
			});
	});

	it('Test User-Restricted call [FAIL BAD token]', done => {
		sendAPI('/user/test-echo', 'post', {
			headers: {'Authorization': $$$.encodeToken(PRIVATE.AUTH_CODE, chamberlainpi.username, "???")},
			body: { foo: 'bar' }
		})
			.then(data => {
				assert.notExists(data);
				done();
			})
			.catch(err => {
				chaiG.padError(err.message.yellow);
				assert.exists(err);
				done();
			});

	});

	it('Test User-Restricted call', done => {
		chamberlainpi.sendLogin()
			.then(() => {
				return chamberlainpi.sendAuth('/user/test-echo', 'post', {body: { foo: 'bar' }})
			})
			.then(data => {
				assert.exists(data);
				assert(data.foo, 'bar', 'Still got {foo:bar} back?');
				done();
			})
			.catch(err => {
				done(err);
			});

	});

	it('Test Password Reset', done => {
		sendAPI('/user/public/forget-password', 'post', {
			headers: {'Authorization': chamberlainpi.getAuthorizationString()},
			body: { username: chamberlainpi.username, direct:1 }
		})
			.then(data => {
				chaiG.showTraces && trace(data);
				assert.exists(data);
				done();
			})
			.catch(err => {
				done(err);
			});

	});

});

