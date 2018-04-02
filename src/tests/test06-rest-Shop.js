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
const TEST = chaiG.makeFailAndOK('shop');

describe('=REST= Shop', () => {
	if(chaiG.filterLevel < 10) return;

	var chamberlainpi, shopInfo, itemIndex0, newItem, intentionalDelay = 1000;
	var itemRandomSword = [{identity: 'item_sword', randomSeeds: chaiG.randomItemSeeds(4,4,4,4)}];

	TEST.SET_USER(() => chamberlainpi = testUsers.chamberlainpi);

	TEST.FAIL('delete::/key', '1.1 Get key (FAIL with Wrong Verb)');

	TEST.OK('get::/key', '2 Get key (chamberlainpi)', (data, done) => {
		if(!data) throw new Error("'data' SHOULD NOT BE NULL!");

		shopInfo = data;

		setTimeout(() => {
			done();
		}, intentionalDelay);
	});

	TEST.OK('get::/key', '3 Get key (chamberlainpi)', (data, done) => {
		var prevShopInfo = shopInfo;
		var prevKey = prevShopInfo.refreshKey;

		shopInfo = data;
		itemIndex0 = {index: 0, seed: shopInfo.refreshKey.seed};

		var key = data.refreshKey;
		assert.exists(key);
		assert.exists(key.dateExpires);
		assert.isTrue(key.seed > 0, 'Is seed > 0');
		assert.isTrue(key.secondsLeft>0, 'Is seconds left > 0');
		assert.equal(key.purchased.length, 0, 'Is purchased.length == 0');
		assert.equal(key.seed, prevKey.seed, 'Is current seed == previous seed');

		setTimeout(() => {
			done();
		}, intentionalDelay);
	});
	
	///////////////////////////////////////////////////////////////// BUY-ITEM (1)

	TEST.FAIL('post::/buy/item', '(chamberlainpi FAIL missing item)');
	TEST.FAIL('post::/buy/item', '(chamberlainpi FAIL item empty)', () => {
		return { body: { item: {} } };
	});

	TEST.FAIL('post::/buy/item', '(chamberlainpi FAIL missing seed)', () => {
		return { body: { item: {index: 0} } };
	});

	TEST.FAIL('post::/buy/item', '(chamberlainpi FAIL invalid seed)', () => {
		return { body: { item: {index: 0, seed: -1} } };
	});

	TEST.FAIL('post::/buy/item', '(chamberlainpi FAIL missing cost)', () => {
		return { body: { item: itemIndex0 } }
	});

	TEST.FAIL('post::/buy/item', '(chamberlainpi FAIL missing cost fields)', () => {
		return { body: { item: itemIndex0, cost: {} } }
	});

	TEST.FAIL('post::/buy/item', '(chamberlainpi FAIL invalid cost value [negative])', () => {
		return { body: { item: itemIndex0, cost: {gold: -1} } };
	});

	TEST.FAIL('post::/buy/item', '(chamberlainpi FAIL missing item list)', () => {
		return { body: { item: itemIndex0, cost: {gold: 1} } };
	});

	TEST.OK('post::/buy/item', 'Buy an Item (chamberlainpi)', () => {
		return {
			body: {
				item: itemIndex0,
				cost: {gold: 1},
				list: itemRandomSword
			}
		};
	}, (data) => {
		//trace(_.jsonPretty(data));
		//trace(data.shop);

		assert.exists(data.item);
		assert.exists(data.shop);
		assert.exists(data.currency);
		newItem = data.item;
		chamberlainpi.game.currency = data.currency;
	});

	TEST.OK('get::/key', 'Get key AND show bought items (chamberlainpi)', (data, done) => {
		var key = data.refreshKey;
		assert.exists(key, 'Has a refreshKey');
		assert.isTrue(key.seed>-1, 'Has a seed');
		assert.isTrue(key.secondsLeft>=0, 'Has secondsLeft');
		assert.isArray(key.purchased, 'Has purchased[] array.');
		assert.isTrue(key.purchased.length===1, 'Has 1 purchase.');
		assert.isTrue(key.purchased[0]===0, 'Purchase[0] === 0.');

		shopInfo = data;

		setTimeout(() => {
			done();
		}, intentionalDelay);
	});

	///////////////////////////////////////////////////////////////// BUY-ITEM (2)

	TEST.FAIL('post::/buy/item', 'Buy Item (chamberlainpi FAIL item already exists w/ valid cost)', () => {
		return {
			body: {
				item: itemIndex0,
				cost: {gold: 1},
				list: itemRandomSword
			}
		}
	});

	///////////////////////////////////////////////////////////////// Refresh Key:

	const bodyRefreshKey = { body: { cost: {gold:1} } };

	TEST.FAIL('get::/key/refresh', 'Refresh key (chamberlainpi FAIL with Wrong Verb)');
	TEST.FAIL('put::/key/refresh', 'Refresh key (chamberlainpi FAIL missing POST data)');
	TEST.OK('put::/key/refresh', 'Refresh key (chamberlainpi)', bodyRefreshKey, data => {
		var key = data.refreshKey;

		shopInfo = data;

		assert.isTrue(data.isRefreshed, 'Is true? [data.isRefreshed]');
		assert.exists(data.currency, 'Exists? [data.currency]');

		assert.exists(key, 'Exists? [data.refreshKey]');
		assert.exists(key.purchased, 'Exists? [data.refreshKey.purchased]');
		assert.isArray(key.purchased, 'Is Array? [data.refreshKey.purchased]');
		assert.equal(key.purchased.length, 0, 'Is purchased empty array');

		chamberlainpi.game.currency = data.currency;
	});

	///////////////////////////////////////////////////////////////// Sell Items

	TEST.OK('delete::/sell/items', 'Sell an Item (chamberlainpi)', () => {
		return {
			body: { items: [newItem], cost: {gold: 1}, }
		}
	}, data => {
		assert.exists(data.currency);
		assert.isTrue(data.isSold, 'isSold == true?');
		assert.equal(data.currency.gold, chamberlainpi.game.currency.gold + 1, 'Should have some extra gold');
		assert.equal(data.numItemsSold, 1, 'numItemsSold == 1?');

		chamberlainpi.game.currency = data.currency;
	});

	///////////////////////////////////////////////////////////////// Add Expansion:

	const gemsCost = gems => ({body: {expansionSlots: 1, cost: {gems: gems} }});

	TEST.FAIL('post::/expansion-slots', '(WRONG VERB)', gemsCost(1));
	TEST.FAIL('put::/expansion-slots', 'Set the Expansion Slots to 1 (FAIL for 99999 Gold)', gemsCost(99999));

	TEST.OK('put::/expansion-slots', 'Set the Expansion Slots to 1 for 1 Gold', gemsCost(1), data => {
		assert.exists(data.currency, 'Currency exists');
		assert.exists(data.shopInfo, 'ShopInfo exists');
		assert.equal(data.shopInfo.expansionSlots, 1, 'ExpansionSlots == 1');
	});

	///////////////////////////////////////////////////////////////// Get / Buy Featured Item:

	function getFeaturedItem(title, isPurchased) {
		TEST.OK('get::/featured-item', title, data => {
			assert.isTrue(data.seed > 0, 'Is seed > 0');
			assert.isTrue(data.isItemPurchased===isPurchased, 'isItemPurchased == ' + isPurchased);
			assert.exists(data.dateCurrent, 'dateCurrent exists');
			assert.exists(data.dateNext, 'dateNext exists');
		});
	}


	function buyFeaturedItem(isOK) {
		const body = {
			body: {
				cost: {gold:1},
				list: [{ identity: 'item_sword', randomSeeds: chaiG.randomItemSeeds(11,11,11,11) }]
			}
		};

		if(isOK) {
			TEST.OK('post::/featured-item/buy', 'Buy Featured Item', body, data => {
				assert.isTrue(data.isItemPurchased, 'isItemPurchased == true');
				assert.exists(data.item, 'item exists');
				assert.exists(data.item.game, 'item.game exists');
				assert.exists(data.currency, 'currency exists');
				assert.exists(data.dateCurrent, 'dateCurrent exists');
				assert.exists(data.dateNext, 'dateNext exists');
				assert.isTrue(data.seed > 0, 'seed > 0');
				assert.equal(data.currency.gold, chamberlainpi.game.currency.gold - 1, 'Should have gold - 1');
			});
		} else {
			TEST.FAIL('post::/featured-item/buy', 'Buy Featured Item (FAIL)', body);
		}
	}

	getFeaturedItem("Get FEATURED-ITEM (BEFORE)", false);

	buyFeaturedItem(true);
	buyFeaturedItem(false);

	getFeaturedItem("Get FEATURED-ITEM (AFTER)", true);

	//buyFeaturedItem();
});