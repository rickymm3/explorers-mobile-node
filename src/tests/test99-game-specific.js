/**
 * Created by Chamberlain on 8/14/2017.
 */
const chaiG = require('../sv-chai-globals');

const assert = chaiG.chai.assert;
const catcher = chaiG.catcher;
const testUsers = chaiG.testUsers;
const User = $$$.models.User;
const TEST = chaiG.makeFailAndOK('user');

describe('=GAME= Specific User Actions', () => {
	TEST.SET_USER(() => testUsers.chamberlainpi);

	TEST.OK('get::/everything', 'GET EVERYTHING!', null, data => {
		assert.exists(data.user, 'user exists.');
		assert.exists(data.user.login, 'login exists.');
		assert.exists(data.user.login.token, 'token exists.');
		assert.exists(data.user.game, 'game exists.');
		assert.exists(data.user.game.currency, 'currency exists.');
		assert.exists(data.items, 'items exists.');
		assert.exists(data.heroes, 'heroes exists.');
		assert.exists(data.explorations, 'explorations exists.');
		assert.exists(data.user.game.boosts, 'boosts info exists.');
		assert.exists(data.user.game.boosts.currency, 'boosts.currency exists.');
		assert.equal(data.items.length>0, true, 'Has some items.');
		assert.equal(data.heroes.length, 3, 'heroes matches..');
	});

	if(chaiG.filterLevel < 10) return;

	TEST.FAIL('post::/completed-act-zone', 'Complete ActZone FAIL', {body: { fail: 1 }});

	TEST.OK('post::/completed-act-zone', 'Complete ActZone OK', {body: { actZone: 1 }}, data => {
		assert.equal(data.exploreSlots, 2, "Explore Slots OK.");
		assert.equal(data.completed, 1, "Completed Count OK.");
	});

	TEST.OK('post::/logout', 'Logout', null, data => {
		chaiG.padError(data.yellow);
		assert.exists(data);
	});

	it('Login User AGAIN (chamberlainpi)', done => {
		testUsers.chamberlainpi.sendLogin()
			.then(data => {
				assert.exists(data);
				done();
			})
	});

	TEST.OK('delete::/everything/remove', 'REMOVE EVERTHING', null, data => {
		assert.exists(data, 'data exists.');
		assert.exists(data.user, 'user exists.');
		assert.exists(data.user.login, 'login exists.');
		assert.exists(data.user.login.token, 'token exists.');
		assert.exists(data.user.game, 'game exists.');
		assert.exists(data.user.game.currency, 'currency exists.');
		assert.exists(data.itemsRemoved, 'items exists.');
		assert.exists(data.heroesRemoved, 'heroes exists.');

		trace(data);
	});

	it('*FAIL* Login User AFTER DELETED (chamberlainpi)', done => {
		testUsers.chamberlainpi.sendLogin()
			.then(data => {
				assert.notExists(data);
				done();
			})
			.catch(err =>{
				assert.exists(err);
				done();
			});
	});
});

