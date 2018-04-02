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
const TEST = chaiG.makeFailAndOK('researchSlot');
const TEST_ITEM = chaiG.makeFailAndOK('item');
const TEST_USER = chaiG.makeFailAndOK('user');

describe('=REST= Research Slots', () => {
	if(chaiG.filterLevel < 9) return;

	const cost = {body:{cost:{gold:1,gems:1}}};
	const gems = {now:0, cost: {gems:2} };
	const itemID = 3;
	const itemToResearch = {body: {itemID: itemID, cost: {scrollsIdentify:1}}};

	TEST.SET_USER(() => testUsers.chamberlainpi);
	TEST_ITEM.SET_USER(() => testUsers.chamberlainpi);
	TEST_USER.SET_USER(() => testUsers.chamberlainpi);

	TEST.OK('get::/list', 'Get list of slots.', null, data => {
		assert.exists(data);
		assert.equal(data.length, 1, 'Should only have 1 slot to begin with.');
	});

	TEST.FAIL('put::/-1/0/unlocked', 'Slot == UNLOCKED (FAIL BELOW TRAY BOUNDS)');
	TEST.FAIL('put::/0/-1/unlocked', 'Slot == UNLOCKED (FAIL BELOW SLOT BOUNDS)');
	TEST.FAIL('put::/3/0/unlocked', 'Slot == UNLOCKED (FAIL ABOVE SLOT BOUNDS)');
	TEST.FAIL('put::/0/4/unlocked', 'Slot == UNLOCKED (FAIL ABOVE SLOT BOUNDS)');
	TEST.FAIL('put::/0/0/unlocked', 'Slot == UNLOCKED (FAIL MISSING COST DATA)');
	TEST.FAIL('get::/0/0/unlocked', 'Slot == UNLOCKED (FAIL WRONG VERB)');

	TEST_USER.OK('put::/currency', `Get the user's currency`, {body:{gold:100, gems:100}}, data => {
		assert.isTrue(data.gold >= 100, 'Has enough gold.');
		assert.isTrue(data.gems >= 100, 'Has enough gems.');
	});

	TEST.OK('put::/1/1/unlocked', 'Slot == UNLOCKED (OK)', cost, data => {
		assert.exists(data.slot, "data.slot exist");
		assert.exists(data.currency, "data.currency exist");
	});

	TEST.OK('get::/list', 'Get list of slots.', null, data => assertSlotList(data, 'unlocked', -1));

	TEST.FAIL('put::/1/1/unlocked', 'Slot == UNLOCKED (FAIL ALREADY UNLOCKED)', cost);

	TEST_ITEM.OK('get::/list', 'Get list of items.', null, data => { false && trace(data) });

	TEST_USER.OK('put::/currency', `Add some scrolls`, {body:{scrollsIdentify:100}}, data => { false && trace(data) });

	TEST.OK('put::/1/1/busy', 'Slot == BUSY (OK)', itemToResearch, data => {
		assert.exists(data.slot, "data.slot exist");
		//assert.exists(data.currency, "data.currency exist");
	});

	TEST.OK('get::/list', 'Get list of slots.', null, data => assertSlotList(data, 'busy', itemID, 1, 1));

	TEST.FAIL('put::/1/1/busy', 'Slot == BUSY (FAIL ALREADY BUSY)', itemToResearch);
	TEST.FAIL('get::/1/1/busy', 'Slot == BUSY (FAIL WRONG VERB)', itemToResearch);

	TEST.FAIL('put::/1/1/completed', 'Slot == COMPLETED (FAIL, TOO EARLY TO COMPLETE)');

	TEST_USER.OK('get::/currency', `View all currencies`, null, data => {
		gems.now = data.gems;
	});

	TEST.OK('put::/1/1/completed', 'Slot == COMPLETED (INSTANTLY!!!)', {body: {cost:gems.cost}}, data => {
		assert.exists(data.slot, "data.slot exist");
		assert.exists(data.currency, 'Currency exists.');
		assert.equal(data.currency.gems, gems.now - gems.cost.gems, 'Gems match.');
	});

	TEST.OK('get::/list', 'Get list of slots.', null, data => assertSlotList(data, 'completed', itemID, 1, 1));

	TEST.FAIL('put::/1/1/completed', 'Slot == COMPLETED (FAIL ALREADY COMPLETED)');

	TEST.OK('put::/1/1/reset', 'Slot == RESET (OK)', null, data => {
		assert.exists(data.slot, "data.slot exist");
	});

	TEST.OK('get::/list', 'Get list of slots.', null, data => assertSlotList(data, 'unlocked', -1, 1, 1));

	TEST.FAIL('put::/1/1/reset', 'Slot == COMPLETED (FAIL ALREADY RESETTED)');
	TEST.FAIL('put::/1/1/unlocked', 'Slot == COMPLETED (FAIL INVALID STATE CHANGE)');
	TEST.FAIL('put::/1/1/completed', 'Slot == COMPLETED (FAIL INVALID STATE CHANGE)');

	function assertSlotList(data, status, itemID, trayID, slotID) {
		var slot = isNaN(trayID) ? data[0] : data.find(s => s.game.trayID===trayID && s.game.slotID===slotID);

		assert.exists(slot);
		assert.exists(slot.game);
		assert.equal(slot.game.status, status, 'status OK.');
		assert.equal(slot.game.itemID, itemID, 'itemID OK.');
	}
});