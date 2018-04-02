/**
 * Created by Chamberlain on 8/14/2017.
 */
const chaiG = require('../sv-chai-globals');
const mgHelpers = require('../sv-mongo-helpers');

const assert = chaiG.chai.assert;
const catcher = chaiG.catcher;
const testUsers = chaiG.testUsers;
const User = $$$.models.User;
const PRIVATE = $$$.env.ini.PRIVATE;
const sendAPI = $$$.send.api;
const TEST = chaiG.makeFailAndOK('user');

describe('=REST= User', () => {
	var currencyBefore;

	it('Test-Post (Hello World test)', done => {
		chaiG.makeTestUsers();

		sendAPI('/test-echo', 'post', { body: {hello: "world"} })
			.then(data => {
				assert.exists(data, 'JSON data exists');
				assert.exists(data.echo);
				assert.equal(data.echo.hello, 'world', 'echo is correct');
				done();
			})
			.catch(catcher(done));
	});

	TEST.SET_USER(() => testUsers.chamberlainpi);

	it('Get Users (ALL)', done => {
		sendAPI('/admin/users')
			.then(data => {
				assert.exists(data, 'JSON data exists');
				assert.equal(data.length, 2, 'data.length correct?');
				assert.equal(data[0].name, 'Pierre', 'Still Pierre');
				assert.equal(data[1].name, 'Peter', 'Still Peter');
				done();
			})
			.catch(catcher(done));
	});

	it('Add User (CHAMBERLAINPI /user/public/add/)', done => {
		testUsers.chamberlainpi.sendAuth('/user/public/add', 'post', "*")
			.then(data => {
				_.extend(testUsers.chamberlainpi, data);
				assert.exists(data);

				setTimeout(done, 50);
			})
			.catch(err => {
				done(err);
			});
	});

	it('Add User (PETER /user/public/add/)', done => {
		testUsers.peter.sendAuth('/user/public/add', 'post', "*")
			.then(data => {
				_.extend(testUsers.peter, data);
				assert.exists(data);

				setTimeout(done, 50);
			})
			.catch(err => {
				done(err);
			});
	});

	it('Login User (chamberlainpi)', done => {
		testUsers.chamberlainpi.sendLogin()
			.then(data => {
				assert.exists(data);
				done();
			})
			.catch(err => {
				done(err);
			});
	});

	it('Login User (peter)', done => {
		testUsers.peter.sendLogin()
			.then(data => {
				assert.exists(data);
				done();
			})
			.catch(err => {
				done(err);
			});
	});

	if(chaiG.filterLevel < 2) return;

	function cost(val) {
		return {
			body: {
				gold:val,
				gems:val,
				magicOrbs: val,
				scrollsIdentify: val,
				scrollsSummonCommon: val
			}
		}
	}

	TEST.OK('get::/currency', 'Check Currency', null, data => {
		currencyBefore = data;
	});

	TEST.OK('put::/currency', 'Add Currency', cost(2), data => {
		assert.equal(data.gold, currencyBefore.gold+2, "gold + 1");
		assert.equal(data.gems, currencyBefore.gems+2, "gems + 1");
		assert.equal(data.magicOrbs, currencyBefore.magicOrbs+2, "magicOrbs + 1");
		assert.equal(data.scrollsIdentify, currencyBefore.scrollsIdentify+2, "scrolls + 1");
		assert.equal(data.scrollsSummonCommon, currencyBefore.scrollsSummonCommon+2, "scrolls + 1");
	});

	TEST.OK('put::/currency', 'Remove Currency', cost(-1), data => {
		assert.equal(data.gold, currencyBefore.gold+1, "gold - 1");
		assert.equal(data.gems, currencyBefore.gems+1, "gems - 1");
		assert.equal(data.magicOrbs, currencyBefore.magicOrbs+1, "magicOrbs - 1");
		assert.equal(data.scrollsIdentify, currencyBefore.scrollsIdentify+1, "scrolls - 1");
		assert.equal(data.scrollsSummonCommon, currencyBefore.scrollsSummonCommon+1, "scrolls - 1");
	});

	TEST.OK('put::/xp', 'Set User XP', { body: { xp: 1234 } }, data => {
		assert.equal(data.game.xp, 1234, 'XP matches.');
	});

	TEST.OK('put::/lastLevel', 'Set User LastLevel', { body: { lastLevel: 3 } }, data => {
		assert.equal(data.game.lastLevel, 3, 'LastLevel matches.');
	});

	TEST.OK('put::/explore-slots', 'Set User Explore Slots', { body: { exploreSlots: 2 } }, data => {
		assert.equal(data.game.actsZones.exploreSlots, 2, 'exploreSlots matches.');
	});

	///////////////////////////////////////////////////////////// TEST LOGOUT:

	TEST.OK('get::/logout', 'Logout (chamberlainpi)', null, data => {
		testUsers.chamberlainpi.login.token = null;
		assert.exists(data);
	});
});