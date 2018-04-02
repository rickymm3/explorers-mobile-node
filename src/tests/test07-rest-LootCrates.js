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

describe('=REST= LootCrates', () => {
	if(chaiG.filterLevel < 10) return;

	var chamberlainpi, peter;

	it('INIT', done => {
		chamberlainpi = testUsers.chamberlainpi;
		peter = testUsers.peter;
		done();
	});

	function successTest(url, header, body, onData) {
		var method = "get";
		if(url.has('::')) {
			var urlSplit = url.split('::');
			method = urlSplit[0];
			url = urlSplit[1];
		}

		it(`/lootcrate${url} ... ${header}`, done => {
			if(_.isFunction(body)) body = body();
			chamberlainpi.sendAuth('/lootcrate' + url, method, body)
				.then(data => {
					assert.exists(data);
					onData(data);
					done();
				})
				.catch(err => done(err));
		});
	}

	function failTest(url, header, body) {
		var method = "get";
		if(url.has('::')) {
			var urlSplit = url.split('::');
			method = urlSplit[0];
			url = urlSplit[1];
		}

		it(`/lootcrate${url} ... ${header}`, done => {
			if(_.isFunction(body)) body = body();
			chamberlainpi.sendAuth('/lootcrate' + url, method, body)
				.then(data => {
					done('Should not exists!');
				})
				.catch(err => {
					assert.exists(err);
					done();
				});
		});
	}

	failTest('post::/url-does-not-exists', '(chamberlainpi FAIL URL DOES NOT EXISTS');
	failTest('get::/add', '(chamberlainpi FAIL Wrong Verb)');
	failTest('post::/add', '(chamberlainpi FAIL Missing lootCrate field)');
	failTest('post::/add', '(chamberlainpi FAIL Missing lootTableIdentity field)', {
		body: {
			lootCrate: {}
		}
	});

	failTest('post::/add', '(chamberlainpi FAIL Missing lootCrateType field)', {
		body: {
			lootCrate: {
				lootTableIdentity: 'lootTableIdentity',
			}
		}
	});

	failTest('post::/add', '(chamberlainpi FAIL Missing zoneIdentity field)', {
		body: {
			lootCrate: {
				lootTableIdentity: 'lootTableIdentity',
				lootCrateType: 'lootCrateType',
			}
		}
	});

	failTest('post::/add', '(chamberlainpi FAIL Missing magicFind field)', {
		body: {
			lootCrate: {
				lootTableIdentity: 'lootTableIdentity',
				lootCrateType: 'lootCrateType',
				zoneIdentity: 'zoneIdentity',
			}
		}
	});

	failTest('post::/add', '(chamberlainpi FAIL Missing name field)', {
		body: {
			lootCrate: {
				lootTableIdentity: 'lootTableIdentity',
				lootCrateType: 'lootCrateType',
				zoneIdentity: 'zoneIdentity',
				magicFind: 1,
			}
		}
	});

	successTest('post::/add', '(chamberlainpi OK)', {
		body: {
			lootCrate: {
				lootTableIdentity: 'lootTableIdentity',
				crateTypeIdentity: 'crateTypeIdentity',
				lootCrateType: 'lootCrateType',
				zoneIdentity: 'zoneIdentity',
				magicFind: 1,
			}
		}
	}, data => {
		assert.isTrue(data.id > 0, 'ID is valid.');
		assert.exists(data.game, '"game" object exists.');
		assert.isTrue(data.game.lootTableIdentity.length>0, 'Has a lootTableIdentity.');
		assert.isTrue(data.game.magicFind>0, 'Has magicFind.');
		assert.isTrue(data.game.crateTypeIdentity.length>0, 'Has a crateTypeIdentity.');
	});

	failTest('post::/list', '(chamberlainpi FAIL Wrong Verb)');

	successTest('/list', '(chamberlainpi OK)', null, datas => {
		assert.isArray(datas);
		assert.isTrue(datas.length===1, 'Has 1 lootcrate.');

		const data = datas[0];
		assert.isTrue(data.id > 0, 'ID is valid.');
		assert.exists(data.game, '"game" object exists.');
		assert.isTrue(data.game.lootTableIdentity.length>0, 'Has a lootTableIdentity.');
		assert.isTrue(data.game.magicFind>0, 'Has magicFind.');
		assert.isTrue(data.game.crateTypeIdentity.length>0, 'Has a crateTypeIdentity.');
	});

	failTest('/remove', '(chamberlainpi FAIL Wrong Verb)');
	failTest('/remove/1', '(chamberlainpi FAIL Wrong Verb)');
	failTest('delete::/remove', '(chamberlainpi FAIL Missing id)');
	failTest('delete::/remove/-1', '(chamberlainpi FAIL Invalid id)');
	failTest('delete::/remove/9999', '(chamberlainpi FAIL Wrong id)');
	successTest('delete::/remove/1', '(chamberlainpi OK)', null,
		data => {
			assert.isTrue(data.isRemoved, 'isRemoved === true.');
			assert.isTrue(data.numRemoved===1, 'numRemoved === 1.');
		}
	);

	successTest('post::/add', '(chamberlainpi OK)', {
		body: {
			lootCrate: {
				lootTableIdentity: 'lootTableIdentity',
				magicFind: 1,
				crateTypeIdentity: 'crateTypeIdentity',
			}
		}
	}, data => {
		assert.isTrue(data.id > 0, 'ID is valid.');
		assert.exists(data.game, '"game" object exists.');
		assert.isTrue(data.game.lootTableIdentity.length>0, 'Has a lootTableIdentity.');
		assert.isTrue(data.game.magicFind>0, 'Has magicFind.');
		assert.isTrue(data.game.crateTypeIdentity.length>0, 'Has a crateTypeIdentity.');
	});

	successTest('post::/add', '(chamberlainpi OK)', {
		body: {
			lootCrate: {
				lootTableIdentity: 'lootTableIdentity',
				magicFind: 1,
				crateTypeIdentity: 'crateTypeIdentity',
			}
		}
	}, data => {
		assert.isTrue(data.id > 0, 'ID is valid.');
		assert.exists(data.game, '"game" object exists.');
		assert.isTrue(data.game.lootTableIdentity.length>0, 'Has a lootTableIdentity.');
		assert.isTrue(data.game.magicFind>0, 'Has magicFind.');
		assert.isTrue(data.game.crateTypeIdentity.length>0, 'Has a crateTypeIdentity.');
	});

});