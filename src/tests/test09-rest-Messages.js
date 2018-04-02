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
const TEST = chaiG.makeFailAndOK('message');

describe('=REST= Messages', () => {
	if(chaiG.filterLevel < 10) return;

	const msgOther = {
		message: 'Other Message',
		dateExpires: moment().add(5, 'second').toISOString()
	};

	const msgExpired = {
		message: 'Expired Message',
		dateExpires: moment().subtract(5, 'second').toISOString()
	};

	const msgLootCrate = {
		message: 'Special LootCrate',
		type: 'LootCrate Reward',
		dateExpires: moment().add(5, 'second').toISOString(),
		reward: {
			item: 'This can really be anything you want.',
			costType: 'free',
			costAmount: 0
		},
	};

	TEST.SET_USER(() => testUsers.chamberlainpi);

	TEST.FAIL('put::/list', 'Get messages (FAIL Wrong Verb)');

	TEST.OK('get::/list', 'Get messages (none)', null, data => {
		assert.exists(data.messages, 'Messages field exists.');
		assert.equal(data.messages.length, 0, 'Messages.length == 0, none at this time.');
	});

	TEST.OK('post::/add', 'Add message #1', {body: makeMessageBody()}, data => checkMessageOK(data));
	TEST.OK('post::/add', 'Add message #2', {body: makeMessageBody(msgOther)}, data => checkMessageOK(data, msgOther));
	TEST.OK('post::/add', 'Add message #3', {body: makeMessageBody(msgExpired)}, data => checkMessageOK(data, msgExpired));
	TEST.OK('post::/add', 'Add message #4', {body: makeMessageBody(msgLootCrate)}, data => checkMessageOK(data, msgLootCrate));

	TEST.OK('get::/list', 'Get messages', null, data => {
		assert.exists(data.messages, 'Messages field exists.');
		assert.equal(data.messages.length, 4, 'Messages.length is correct.');

		checkMessageOK(data.messages[0]);
		checkMessageOK(data.messages[1], msgOther);
		checkMessageOK(data.messages[2], msgExpired);
		checkMessageOK(data.messages[3], msgLootCrate);
	});

	TEST.OK('get::/inbox', 'Get message-headers relevant to user.', null, data => {
		assert.equal(data.length, 3, 'Inbox messages.length correct.');
		checkInboxOK(data[0]);
		checkInboxOK(data[1]);
		checkInboxOK(data[2]);
	});

	TEST.FAIL('get::/open', 'Open message (FAIL Wrong Verb)');
	TEST.FAIL('put::/open', 'Open message (FAIL missing messageId)');
	TEST.FAIL('put::/open/one/read', 'Open message (FAIL invalid messageId)');
	TEST.FAIL('put::/open/9999/read', 'Open message (FAIL non-existing messageId)');

	TEST.OK('put::/open/1/read', 'Read message.', null, data => {
		checkMessageOK(data.message);
	});

	TEST.FAIL('put::/open/9999/claim', 'Claim the reward (FAIL message does not exists)');
	TEST.FAIL('put::/open/1/claim', 'Claim the reward (FAIL wrong message type)');
	TEST.FAIL('put::/open/4/claim', 'Claim the reward (FAIL must read first)');

	TEST.OK('put::/open/4/read', 'Read message.', null, data => {
		checkMessageOK(data.message, msgLootCrate);
		checkReceiptOK(data.receipt, {isRead:true, isClaimed: false});
	});

	TEST.OK('put::/open/4/claim', 'Claim the reward.', null, data => {
		checkMessageOK(data.message, msgLootCrate);
		checkReceiptOK(data.receipt, {isRead:true, isClaimed: true});
	});

	TEST.OK('put::/open/4/delete', 'Delete the message.', null, data => {
		assert.equal(data.ok, 1, 'ok==1 correct.');
		assert.equal(data.isDeleted, 1, 'isDeleted==1 correct.');
	});

	TEST.FAIL('put::/open/4/read', 'Claim the reward (FAIL message deleted)');
	TEST.FAIL('put::/open/4/claim', 'Claim the reward (FAIL message deleted)');
	TEST.FAIL('put::/open/4/delete', 'Claim the reward (FAIL message deleted)');

	TEST.OK('get::/inbox', 'Get message-headers AFTER deleting.', null, data => {
		assert.equal(data.length, 2, 'Inbox messages.length correct.');
		checkInboxOK(data[0]);
		checkInboxOK(data[1]);
	});

	TEST.OK('put::/open/1/delete', 'Delete the message.', null, data => {
		assert.equal(data.ok, 1, 'ok==1 correct.');
		assert.equal(data.isDeleted, 1, 'isDeleted==1 correct.');
	});

	TEST.OK('get::/inbox', 'Get message-headers AFTER deleting.', null, data => {
		assert.equal(data.length, 1, 'Inbox messages.length correct.');
		checkInboxOK(data[0]);
	});

	TEST.OK('put::/open/2/read', 'Read the only message.', null, data => {
		//trace(data);
	});

	//////////////////////////////////////////////////////////////////////////////////

	function checkInboxOK(data) {
		assert.exists(data, 'data exists.');
		assert.exists(data.hasReceipt, 'data.hasReceipt exists.');

		const header = data.header;
		assert.exists(header, 'header exists.');
		assert.exists(header.type, 'header.type exists.');
		assert.exists(header.title, 'header.title exists.');
		assert.exists(header.sentFrom, 'header.sentFrom exists.');
		assert.exists(header.isForEveryone, 'header.isForEveryone exists.');
		assert.exists(header.dateExpires, 'header.dateExpires exists.');
	}

	function checkMessageOK(data, compareWith) {
		if(!data || !data.game) throw new Error("Missing 'data.game' in message response.");

		const compare = _.merge({
			type: 'Generic Message',
			imageURL: 'JOB_IMAGE_URL',
			title: 'JOB_TITLE',
			message: 'JOB_MESSAGE',
		}, compareWith);

		const game = data.game;
		assert.exists(game, 'game field exists.');
		_.keys(compare).forEach(key => {
			const value = game[key];
			const compareValue = compare[key];
			const label = key + " is correct";

			if(_.isObject(value)) {
				assert.deepEqual(value, compareValue, label + ' deeply');
			} else {
				assert.equal(value, compareValue, label);
			}
		});
	}

	function checkReceiptOK(data, compareWith) {
		if(!data || !data.game) throw new Error("Missing 'data.game' in message response.");

		const game = data.game;
		assert.exists(game, 'game field exists.');
		if(!compareWith) return;

		_.keys(compareWith).forEach(key => {
			const value = game[key];
			const compareValue = compareWith[key];
			const label = key + " is correct";

			if(_.isObject(value)) {
				assert.deepEqual(value, compareValue, label + ' deeply');
			} else {
				assert.equal(value, compareValue, label);
			}
		});
	}

	function makeMessageBody(customBody) {
		const defaultBody = {
			jobName: 'JOB_NAME',
			jobID: 'JOB_ID',
			title: 'JOB_TITLE',
			message: 'JOB_MESSAGE',
			imageURL: 'JOB_IMAGE_URL',
			dateExpires: moment().add(1, 'day'),
			type: 'Generic Message',
			isPublished: true,
			isForEveryone: true
		};

		return {game: _.merge(defaultBody, customBody)};
	}

});