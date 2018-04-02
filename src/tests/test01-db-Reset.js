/**
 * Created by Chamberlain on 8/14/2017.
 */
const chaiG = require('../sv-chai-globals');

const mongoose = chaiG.mongoose;
const request = chaiG.request;
const assert = chaiG.chai.assert;
const catcher = chaiG.catcher;
const User = $$$.models.User;
const Item = $$$.models.Item;
const testUsers = chaiG.testUsers;
const sendAPI = $$$.send.api;


describe('=MONGO= Users', () => {
	trace("Filter Level: ".magenta + chaiG.filterLevel);

	var db;
	const TEST_PASSWORD = $$$.md5('PI#RR#');

	try { db = mongoose.connection.db } catch(err) {}

	it('Mongoose Init', done => {
		assert.exists(mongoose);
		assert.exists(mongoose.connection, 'Connection exists?');
		assert.exists(mongoose.connection.db, 'Database exists?');

		db.listCollections().toArray()
			.then(list => {
				chaiG.collectionNames = list
					.map(db => db.name)
					.filter(listName => listName!=='identitycounters');

				trace("Mongo Collections: ".yellow + chaiG.collectionNames.join(', '));

				setTimeout(done, 250);
			})
	});

	it('Drop Collections (ALL)', done => {
		const drops = chaiG.collectionNames.map(listName => db.dropCollection(listName));

		Promise.all(drops)
			.then(datas => {
				assert.equal(datas.length, drops.length, 'Successfully dropped all tables?');

				process.nextTick(done);
			})
			.catch(err => {
				process.exit(1);
			});
	});

	it('Reset User Count', done => {
		_.values($$$.models).forEach(model => {
			model.resetCount((err, ok) => {
				if(err) return done(err);
			});
		});

		process.nextTick(done);
	});

	it('Create Pierre (pierre@pierrechamberlain.ca)', done => {
		const Pierre = testUsers.pierre = new User({
			name: "Pierre",
			email: "pierre@pierrechamberlain.ca",
			username: "pierre",
			_password: TEST_PASSWORD
		});

		Pierre.save()
			.then(data => {
				testUsers.pierre = Pierre;

				assert.exists(Pierre);
				assert.equal(Pierre.name, "Pierre", "Should be correct name.");
				assert.equal(Pierre.email, "pierre@pierrechamberlain.ca", "Should be correct email.");

				done();
			})
			.catch(err => {
				done(err);
			});
	});

	it('Create "Pierre" long password', done => {
		const PierreFail = new User({
			name: "Pierre2",
			email: "pierre@pierrechamberlain.ca2",
			username: "pierre",
			_password: 'PI#RR#PI#RR#PI#RR#PI#RR#PI#RR#PI#RR#PI#RR#PI#RR#PI#RR#PI#RR#PI#RR#PI#RR#PI#RR#PI#RR#PI#RR#PI#RR#PI#RR#PI#RR#PI#RR#PI#RR#PI#RR#PI#RR#PI#RR#PI#RR#PI#RR#PI#RR#PI#RR#PI#RR#PI#RR#PI#RR#PI#RR#PI#RR#PI#RR#PI#RR#PI#RR#PI#RR#PI#RR#PI#RR#PI#RR#PI#RR#'
		});

		PierreFail.save()
			.then(data => {
				assert.notExists(PierreFail);
				done();
			})
			.catch(err => {
				assert.exists(err);
				done();
			});
	});

	it('Create "Pierre" long email', done => {
		const PierreFail = new User({
			name: "Pierre2",
			username: "pierre4",
			email: "pierrepierrepierrepierrepierrepierrepierrepierrepierrepierrepierrepierrepierrepierrepierrepierrepierrepierrepierrepierrepierrepierrepierrepierrepierrepierrepierrepierrepierrepierrepierrepierrepierrepierrepierrepierrepierrepierrepierre@pierrechamberlain.ca",
			_password: TEST_PASSWORD,
		});

		PierreFail.save()
			.then(data => {
				trace(data);

				assert.notExists(PierreFail, 'Data should not exists, it is a duplicate.');
				done();
			})
			.catch(err => {
				assert.exists(err);

				const output = [];

				_.keys(err.errors).forEach(key => {
					output.push(err.errors[key]);
				});

				//trace(output.join("\n").yellow);

				done();
			});
	});

	it('Create 2nd Pierre', done => {
		const PierreFail = new User({
			name: "Pierre",
			email: "pierre2@gmail.com",
			username: "pierre",
			_password: TEST_PASSWORD
		});

		User.find({username: PierreFail.username}).limit(1).exec()
			.then(data => {
				assert.equal(data.length > 0, true, 'Has existing Pierre user.');

				if(!data.length) throw "Should have found one 'pierre' user!";

				done();
			})
			.catch(err => {
				done(err);
			});
	});

	it('Create "Peter"', done => {
		const Peter = new User({ name: "Peter", email: "peter@gmail.com", username: "peter", _password: 'pi3rr3' });

		Peter.save( (err, data) => {
			if(err) throw err;

			testUsers.peter = data;

			assert.equal(Peter.name, "Peter", "Should be correct name.");

			done();
		});
	});

	it('Get One (1, any)', done => {
		User.findOne().exec((err, data) => {
			if(err) throw err;

			assert.exists(data);
			assert.equal(data.name, 'Pierre');

			done();
		});
	});

	it('Get One (1, Pierre)', done => {
		User.findOne({name: 'Pierre'}).exec((err, data) => {
			if(err) throw err;

			assert.equal(data.name, 'Pierre');

			done();
		});
	});

	it('Get One (1, not found)', done => {
		User.findOne({name: 'John Doe'}).exec((err, data) => {
			if(err) throw err;

			assert.notExists(data);

			done();
		});
	});

	it('Get Many (all)', done => {
		User.find().exec((err, data) => {
			if(err) throw err;

			assert.isArray(data);
			assert.equal(data.length, 2);
			assert.equal(data[0].name, 'Pierre');
			assert.equal(data[1].name, 'Peter');

			done();
		});
	});

	it('Get Many (peter@gmail.com)', done => {
		User.find({email: 'peter@gmail.com'}).exec((err, data) => {
			if(err) throw err;

			assert.isArray(data);
			assert.equal(data.length, 1);
			assert.equal(data[0].name, 'Peter');

			done();
		});
	});
});