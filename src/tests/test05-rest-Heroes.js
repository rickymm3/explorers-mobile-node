/**
 * Created by Chamberlain on 8/14/2017.
 */
const chaiG = require('../sv-chai-globals');
const moment = require('moment');

const assert = chaiG.chai.assert;
const catcher = chaiG.catcher;
const testUsers = chaiG.testUsers;
const User = $$$.models.User;
const PRIVATE = $$$.env.ini.PRIVATE;
const sendAPI = $$$.send.api;
const TEST = chaiG.makeFailAndOK('hero');
const TEST_ITEM = chaiG.makeFailAndOK('item');
const TEST_USER = chaiG.makeFailAndOK('user');

describe('=REST= Heroes', () => {
	if(chaiG.filterLevel < 8) return;

	var chamberlainpi, heroTestForSwap=0, hero0=0, hero1=1, item0=0, item1=1;

	TEST.SET_USER(() => chamberlainpi = testUsers.chamberlainpi);
	TEST_ITEM.SET_USER(() => chamberlainpi);
	TEST_USER.SET_USER(() => chamberlainpi);

	TEST.OK('post::/add', 'Add Custom Heroes (chamberlainpi)', {
		body: {
			list: [
				{identity: 'hero_guardian', randomSeeds: {variance: 1}},
			]
		}
	}, data => {
		assert.exists(data.oldest);
		assert.exists(data.newest);
	});

	TEST.OK('post::/add', 'Add Custom Heroes (chamberlainpi)', {
		body: {
			list: [
				// THIS HERO IS IMPORTANT TO TEST OUT THE SWAP (only one that currently has a awakening-reference:
				{identity: 'hero_rareassassin', randomSeeds: {variance: 4}}, //<--- DON'T CHANGE!!!
				{identity: 'hero_guardian', randomSeeds: {variance: 5}},
			]
		}
	}, data => {
		assert.exists(data.oldest);
		assert.exists(data.newest);
		assert.equal(data.newest.length, 2);

		//Don't take any chances, just FIND the 'rareassassin' manually from the results:
		heroTestForSwap = data.newest.find(hero => hero.game.identity==='hero_rareassassin');

		assert.equal(data.newest[0].userId, chamberlainpi.id, "newest Hero ID == User ID");
		assert.equal(data.oldest[0].userId, chamberlainpi.id, "oldest Hero ID == User ID");
	});

	TEST.OK('get::/list', 'Get all heroes', null, datas => {
		assert.exists(datas);
		assert.equal(datas.length, 3);
		chamberlainpi.heroes = datas;

		hero0 = chamberlainpi.heroes[0];
		item0 = chamberlainpi.items[0];
		hero1 = chamberlainpi.heroes[1];
		item1 = chamberlainpi.items[1];
	});

	////////////////////////////////////////////////////// EQUIP TESTS

	TEST_ITEM.OK(() => `put::/${item0.id}/equip-to/${hero0.id}`, 'Equip item to a hero (0 - 0)', null, datas => {
		assert.exists(datas.item);
		assert.equal(datas.previousHeroID, 0);
	});

	TEST_ITEM.OK(() => `put::/${item1.id}/equip-to/${hero1.id}`, 'Equip item to a hero (1 - 1)', null, datas => {
		assert.exists(datas.item);
		assert.equal(datas.previousHeroID, 0);
	});

	TEST_ITEM.OK(() => `put::/${item0.id}/equip-to/${hero1.id}`, 'Equip item to a hero (PASS FROM PREVIOUS HERO!)', null, datas => {
		assert.exists(datas.item);
		assert.equal(datas.previousHeroID, 1);
	});

	TEST_ITEM.OK(() => `put::/${item0.id}/unequip`, 'Unequip item 0', {body: {cost: {gold:1}}}, data => {
		assert.exists(data);
		// trace("Unequipped item:");
		// trace(data);
	});

	TEST_ITEM.OK('get::/list', 'Get list of items (chamberlainpi)', null, data => {
		assert.exists(data);
		assert.equal(data.length > 0, true);
	});

	TEST_ITEM.OK(() => `get::/equipped-on/${hero0.id}`, 'Check equipped items (chamberlainpi on hero0)', null, data => {
		assert.exists(data);
		assert.equal(data.length, 0);
	});

	TEST_ITEM.OK(() => `get::/equipped-on/${hero1.id}`, 'Check equipped items (chamberlainpi on hero1)', null, data => {
		assert.exists(data);
		assert.equal(data.length, 1);
		assert.equal(data[0].userId, chamberlainpi.id);
		assert.equal(data[0].game.heroEquipped, hero1.id);
	});

	TEST_ITEM.OK(`get::/equipped-off`, 'Check NON-equipped items (chamberlainpi)', null, data => {
		assert.exists(data);
		assert.equal(data.length>0,true);
	});

	TEST_ITEM.FAIL(`put::/1/equip-to/9999`, 'Equip item to a hero (FAIL with WRONG HERO ID!)');
	TEST_ITEM.FAIL(`put::/9999/equip-to/1`, 'Equip item to a hero (FAIL with WRONG ITEM ID!)');

	TEST_ITEM.SET_USER(() => null);
	TEST_ITEM.FAIL(`put::/1/equip-to/1`, 'Equip item to a hero (FAIL UNAUTHORIZED)');

	TEST_ITEM.SET_USER(() => chamberlainpi);

	TEST_ITEM.OK(`get::/equipped-on/9999`, 'Check equipped items (chamberlainpi on hero 9999 [EMPTY])', null, data => {
		assert.exists(data);
		assert.equal(data.length, 0);
	});

	////////////////////////////////////////////////////// TAP-ABILITY:

	TEST.OK(`put::/1/tap-ability`, 'Update Tap-Ability on a hero (1)', () => ({body: {dateTapped: moment()}}), data => {
		assert.exists(data);
		assert.equal(data.id, 1, "Updated Hero 1.");
		assert.exists(data.game.dateLastUsedTapAbility, 'Date last Tap Ability');
	});


	TEST.FAIL(`put::/1/tap-ability/`, 'Update Tap-Ability on a hero (FAIL, missing dateTapped)');

	////////////////////////////////////////////////////// SKILLS:

	TEST.OK(`put::/1/skill-levels`, 'Update SkillLevels on a hero (1)', {
		body: {
			skillLevels: [
				{level:1, identity: 'test'},
				{level:2, identity: 'test'},
				{level:3, identity: 'test'}
			],
		}
	}, data => {
		assert.exists(data, 'data exists');
		assert.equal(data.id, 1, "Updated Hero 1.");
		assert.exists(data.game.skills, 'Skills exists');

		const levels = data.game.skills.map(s => s.level);
		assert.equal(levels[0], 1, "Has a Level #0");
		assert.equal(levels[1], 2, "Has a Level #1");
		assert.equal(levels[2], 3, "Has a Level #2");
	});

	////////////////////////////////////////////////////// SWAP-IDENTITY: ////////////////////////////////////////////////////// TODO: bookmark right here!!!!!

	const swapIdentity = e => ({body: { identity: 'hero_rareassassin_dark', cost: {essenceHigh: e} }});
	const addEssence = e => ({body:{essenceLow:e,essenceMid:e, essenceHigh:e}});

	TEST.FAIL(() => `put::/9999/swap-identity/`, 'Swap Identity on a hero (FAIL DOES NOT EXISTS)', swapIdentity(1));

	TEST.FAIL(() => `put::/0/swap-identity/`, 'Swap Identity on a hero (FAIL IS NOT COMPATIBLE)', swapIdentity(1));
	TEST.FAIL(() => `put::/${heroTestForSwap.id}/swap-identity/`, 'Swap Identity on a hero (FAIL TOO EXPENSIVE)', swapIdentity(9999));
	TEST.FAIL(() => `put::/${heroTestForSwap.id}/swap-identity/`, 'Swap Identity on a hero (FAIL UNSUFFICIENT ESSENCE)', swapIdentity(1));

	TEST_USER.OK(() => 'put::/currency', 'Add some essences', addEssence(1), data => {
		assert.equal(data.essenceHigh, 1, 'Has some essenceHigh now.');
	});

	TEST.OK(() => `put::/${heroTestForSwap.id}/swap-identity/`, 'Swap Identity on a hero (OK)', swapIdentity(1), data => {
		assert.exists(data, 'data exists');

		const heroData = data.hero.game;
		const currency = data.currency;

		assert.exists(heroData, 'data.game exists');
		assert.equal(heroData.identity, data.body.identity, 'Swapped with correct identity');
		assert.equal(currency.essenceHigh, 0, "Essence High == 0");
	});

	////////////////////////////////////////////////////// LIST:

	TEST.OK('get::/list/available','List available heroes (where "exploringActZone" == 0)', null, datas => {
		assert.exists(datas);
		assert.isArray(datas);
		assert.equal(datas[0].id, 1, "Listing Hero 1.");
		assert.equal(datas[1].id, 2, "Listing Hero 2.");
	});

	////////////////////////////////////////////////////// UPDATES

	TEST.OK(() => `put::/${hero1.id}/xp`, 'Update Hero XP (chamberlainpi hero 1)', {body: {xp: 1234}}, data => {
		assert.exists(data);
		assert.equal(data.game.xp, 1234, 'XP hero matches.');
	});

	TEST.OK(`put::/reset-exploration`, 'Reset Explorations (chamberlainpi)', null, data => {
		assert.exists(data);
	});

	////////////////////////////////////////////////////// USER ANALYTICS

	TEST_USER.OK('get::/analytics', 'Get User Analytics', null, data => {
		assert.exists(data, 'Analytics exists.');
		assert.exists(data.heroesDiscovered, 'heroesDiscovered exists.');
		assert.equal(data.heroesDiscovered.length, 2, 'heroesDiscovered.length matches.');

		const discovered0 = data.heroesDiscovered[0];
		const discovered1 = data.heroesDiscovered[1];

		assert.equal(discovered0.identity, 'hero_guardian', 'discovered0.identity matches.');
		assert.equal(discovered1.identity, 'hero_rareassassin', 'discovered1.identity matches.');

		assert.equal(discovered0.count, 2, 'discovered0.count matches.');
		assert.equal(discovered1.count, 1, 'discovered1.count matches.');
	});

	////////////////////////////////////////////////////// DELETE

	if(chaiG.filterLevel < 5) return;

	if(false) {
		TEST.FAIL(`get::/1/remove`, 'Delete hero (chamberlainpi FAIL Wrong Verb)');

		TEST.OK(() => `delete::/${hero1.id}/remove`, 'Delete hero (chamberlainpi with hero 1)', null, data => {
			assert.exists(data);
			assert.exists(data.removed);
			assert.equal(data.removed.id, 2);
			assert.equal(data.numItemsAffected, 1, 'Items affected.');
		});

		TEST.OK(`delete::/remove-all`, 'Delete hero (chamberlainpi REMOVE ALL)', null, data => {
			assert.exists(data);
			assert.notExists(data.removed);
			assert.equal(data.numItemsAffected===0, true);
		});
	}

	TEST.OK(`get::/list`, 'Get all heroes (AGAIN)', null, datas => {
		assert.exists(datas);
		chamberlainpi.heroes = datas;
	});
});