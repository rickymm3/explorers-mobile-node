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
const TEST = chaiG.makeFailAndOK('item');
const TEST_USER = chaiG.makeFailAndOK('user');

describe('=REST= Items', () => {
	if(chaiG.filterLevel < 2) return;

	const randomItemSeeds = chaiG.randomItemSeeds;
	var chamberlainpi, peter;

	TEST.SET_USER(() => peter = testUsers.peter);
	TEST.SET_USER(() => chamberlainpi = testUsers.chamberlainpi);

	TEST.OK('get::/list', 'Get all items', null, datas => {
		assert.exists(datas);
		assert.equal(datas.length, 0);
	});

	TEST.FAIL('post::/list', 'Get all items (FAIL wrong HTTP VERB)');

	TEST.OK('post::/add', 'Add item (chamberlainpi)', {
		body: {
			list: [
				{identity: 'item_sword', randomSeeds: randomItemSeeds(1,1,1,1)},
				{identity: 'item_scythe', randomSeeds: randomItemSeeds(2,2,2,2)},
				{identity: 'item_sword', randomSeeds: randomItemSeeds(3,3,3,3)}
			]
		}
	}, datas => {
		assert.exists(datas);
		assert.exists(datas.newest);
		assert.exists(datas.oldest);
	});

	TEST.OK('post::/add', 'Add currency item $$$ (chamberlainpi)', {
		body: {
			list: [
				{identity: 'item_sword', randomSeeds: randomItemSeeds(1,1,1,1)},
				{identity: 'item_hero_scroll'},
				{identity: 'item_identity_scroll'},
			]
		}
	}, datas => {
		assert.exists(datas);
	});

	TEST.FAIL('post::/add', 'Add item WITH HERO-ID (FAIL, HERO does not exists!)', {
		body: {
			list: [
				{identity: 'item_sword', randomSeeds: randomItemSeeds(1,1,1,1)},
				{identity: 'item_scythe', randomSeeds: randomItemSeeds(2,2,2,2)},
				{identity: 'item_sword', randomSeeds: randomItemSeeds(3,3,3,3)}
			],
			heroID: 1,
		}
	});

	TEST.OK('get::/list', 'Get all items (and STORE it)', null, datas => {
		assert.exists(datas);

		chamberlainpi.items = datas;
	});

	TEST.SET_USER(() => testUsers.peter);

	TEST.FAIL('post::/add', 'Add item (FAIL - INVALID for peter)', {
		body: {
			list: [
				{identity: 'item_sword', randomSeeds: randomItemSeeds(4,4,4,4)},
				{identity: 'item_bazooka', randomSeeds: randomItemSeeds(5,5,5,5)},
				{identity: 'item_frying_pan', randomSeeds: randomItemSeeds(6,6,6,6)},
			]
		}
	});

	TEST.FAIL('post::/add', 'Add item (FAIL - missing LIST for peter)', {body: { empty: true }});

	var peterItem;
	TEST.OK('post::/add', 'Add custom item (VALID for peter)', {
		body: {
			list: [
				{identity: 'item_sword', randomSeeds: randomItemSeeds(7,7,7,7)},
				{identity: 'item_sword', randomSeeds: randomItemSeeds(7,7,7,7)},
			]
		}
	}, datas => {
		assert.exists(datas.newest);
		assert.exists(datas.oldest);

		peterItem = datas.newest[0];
	});

	///////////////////////////////////////////////////// REMOVE ITEMS:


	TEST.SET_USER(() => testUsers.chamberlainpi);
	TEST.FAIL(`get::/0/remove`, 'Remove item (FAIL wrong VERB)');
	TEST.FAIL('delete::/9999/remove', 'Remove item (FAIL wrong id 9999)');
	TEST.FAIL('get::/remove-all', 'Remove ALL items (FAIL wrong VERB)');

	TEST.SET_USER(() => testUsers.peter);
	TEST.OK('delete::/remove-all', 'Remove ALL items (peter)', null, data => {
		assert.equal(data.numRemoved, 2, "numRemoved");
	});

	TEST.OK('get::/list', 'Get all items (peter, after deleting)', null, datas => {
		assert.equal(datas.length, 0, "items == 0");
	});

	var item1, item2;
	TEST.SET_USER(() => testUsers.chamberlainpi);
	TEST.OK('get::/list', 'Get all items (chamberlainpi, after deleting)', null, datas => {
		assert.isTrue(datas.length > 0, "items > 0");
		item1 = datas[0];
		item2 = datas[1];
	});
});