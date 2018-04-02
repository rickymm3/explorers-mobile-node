const chaiG = require('../sv-chai-globals');
const mgHelpers = require('../sv-mongo-helpers');

const assert = chaiG.chai.assert;
const catcher = chaiG.catcher;
const testUsers = chaiG.testUsers;
const User = $$$.models.User;
const PRIVATE = $$$.env.ini.PRIVATE;
const sendAPI = $$$.send.api;
const TEST = chaiG.makeFailAndOK('user');

describe('=REST= Boosts', () => {
	///////////////////////////////////////////////////////////// TEST BOOSTS:
	TEST.SET_USER(() => testUsers.chamberlainpi);

	TEST.FAIL('post::/boosts/add', 'Add Boost (FAIL WRONG VERB)');
	TEST.FAIL('get::/boosts/0', 'Access boost 0 (FAIL out of bounds)', null);
	TEST.FAIL('get::/boosts/1', 'Access boost 1 (FAIL also out of bounds)', null);
	TEST.OK('get::/boosts/currency', 'Get boost currency', null, data => {
		checkBoostCurrency(data.currency, 0);
	});

	TEST.OK('put::/boosts/currency', 'Add boost currency (1 each)', {body: {boost_gold:1, boost_xp:1, boost_health:1, boost_magicfind:1}}, data => {
		checkBoostCurrency(data.currency, 1);
	});

	var goldNow = 0;
	TEST.OK('put::/boosts/add', 'Add 1st Boost', boostCost(1), data => {
		assert.exists(data.currency, 'Currency exists');
		goldNow = data.currency.gold;
	});

	TEST.OK('get::/boosts/0', 'Access boost 0', null, data => {
		checkBoostData(data.boost);
	});

	TEST.FAIL('get::/boosts/1', 'Access boost 1 (FAIL STILL out of bounds)', null);
	TEST.FAIL('put::/boosts/0/activate', 'ACTIVATE boost 0 (FAIL missing boostData)', null);
	TEST.FAIL('put::/boosts/0/activate', 'ACTIVATE boost 0 (FAIL missing boostData)', boostBody('fail'));

	TEST.OK('put::/boosts/0/activate', 'ACTIVATE boost 0', boostBody('boost_gold'), data => {
		checkBoostData(data.boost, {identity: 'boost_gold', isActive: true, count: 1});
		assert.exists(data.currency);
		assert.equal(data.currency.boost_gold, 0, 'Is boost_gold == 0.');
	});

	TEST.FAIL('put::/boosts/0/activate', 'ACTIVATE boost 0 (FAIL already activated)', boostBody('boost_gold'));

	TEST.OK('put::/boosts/0/decrease', 'Decrease boost 0\'s used count.', null, data => {
		checkBoostData(data.boost, {identity: '', isActive: false, count: 0});
		assert.isTrue(data.isDepleted, 'Is Depleted?');
	});

	TEST.OK('put::/boosts/add', 'Add 2nd Boost', boostCost(1), data => {
		checkBoostData(data.boosts.slots[0], {identity: '', isActive: false, count: 0});
		checkBoostData(data.boosts.slots[1], {identity: '', isActive: false, count: 0});

		assert.equal(data.boosts.currency.boost_gold, 0, 'boost_gold is correct value');
		assert.equal(data.boosts.currency.boost_xp, 1, 'boost_xp is correct value');
		assert.equal(data.boosts.currency.boost_health, 1, 'boost_health is correct value');
		assert.equal(data.boosts.currency.boost_magicfind, 1, 'boost_magicfind is correct value');
		assert.exists(data.currency, 'Currency exists');
		assert.isTrue(data.currency.gold < goldNow, 'Is gold < last time when 1st boost-slot added.');
	});

	TEST.FAIL('put::/boosts/1/activate', 'ACTIVATE boost 1 (FAIL Unsufficient boost currency)', boostBody('boost_gold'));
	TEST.OK('put::/boosts/currency', 'Add 1 boost_gold currency', {body:{boost_gold:1}}, data => {
		assert.exists(data);
		assert.exists(data.currency);
		assert.isTrue(data.currency.boost_gold > 0, "boostGold is > 0.");
	});

	TEST.OK('put::/boosts/1/activate', 'ACTIVATE boost 1', boostBody('boost_gold', {forceCount: 2}), data => {
		checkBoostData(data.boost, {identity: 'boost_gold', isActive: true, count: 2});
		assert.exists(data.currency);
		assert.equal(data.currency.boost_gold, 0, 'Is boost_gold == 0.');
	});

	TEST.OK('put::/boosts/1/decrease', 'Decrease boost 1\'s used count.', null, data => {
		checkBoostData(data.boost, {identity: 'boost_gold', isActive: true, count: 1});
		assert.isFalse(data.isDepleted, 'Is NOT Depleted?');
	});

	TEST.OK('put::/boosts/1/decrease', 'Decrease boost 1\'s used count.', null, data => {
		checkBoostData(data.boost, {identity: '', isActive: false, count: 0});
		assert.isTrue(data.isDepleted, 'Is Depleted?');
	});

	TEST.FAIL('put::/boosts/1/decrease', 'Decrease boost 1 (FAIL depleted)');

	TEST.FAIL('put::/boosts/clear-all', 'Clear All boosts slots (FAIL Wrong Verb)');
	TEST.OK('delete::/boosts/clear-all', 'Clear All boosts slots', null, data => {
		assert.exists(data.slots);
		assert.isTrue(data.slots.length===0, 'Is slots empty.');
	});

	function boostCost(goldAmount) {
		return {body: {cost: {gold:goldAmount}}};
	}
	function boostBody(identity, extra) {
		return {body: _.merge({identity:identity}, extra)};
	}

	function checkBoostData(data, compare) {
		if(!compare) compare = {count: 0, isActive: false};

		assert.exists(data.identity, "Boost.identity exists.");
		assert.exists(data.dateStarted, "Boost.dateStarted exists.");

		_.keys(compare).forEach(key => {
			assert.equal(data[key], compare[key], `"${key}" matches.`);
		});
	}

	function checkBoostCurrency(data, value) {
		assert.exists(data, 'Has boostCurrency result.');

		_.keys(data).forEach(key => {
			assert.equal(data[key], value, `"${key}" matches.`);
		});
	}
});
