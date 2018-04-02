/**
 * Created by Chamberlain on 9/8/2017.
 */
/**
 * Created by Chamberlain on 8/29/2017.
 */

const gameHelpers = require('../sv-json-helpers');
const mgHelpers = require('../sv-mongo-helpers');
const mongoose = mgHelpers.mongoose;
const Schema  = mongoose.Schema;
const Types  = Schema.Types;
const CustomTypes  = mongoose.CustomTypes;
const ObjectId = Types.ObjectId;
const CONFIG = $$$.env.ini;

module.exports = function() {
	const moment = require('moment');

	var User, Shop, Item;

	process.nextTick( () => {
		User = $$$.models.User;
		Shop = $$$.models.Shop;
		Item = $$$.models.Item;
	});

	return {
		plural: 'lootcrates',

		customRoutes: {
			//////////////////////////////////////////////////////////////

			'*'(Model, req, res, next, opts) {
				const user = req.auth.user;

				next();
			},

			'add/'(Model, req, res, next, opts) {
				const user = req.auth.user;
				const crate = opts.data.lootCrate;

				_.promise(() => {
					if(mgHelpers.isWrongVerb(req, 'POST')) return;
					if(!crate) throw 'Missing "lootCrate" in POST data.';
					if(mgHelpers.hasMissingFields(crate, 'lootTableIdentity,crateTypeIdentity,magicFind')) return;
					if(isNaN(crate.magicFind)) throw 'Invalid "magicFind" (isNaN) value in POST data.';

					var lootCrate = new Model();
					lootCrate.userId = user.id;
					_.extend(lootCrate.game, crate);

					return lootCrate.save();
				})
					.then( saved => {
						mgHelpers.sendFilteredResult(res, saved);
					})
					.catch( err => $$$.send.error(res, err));
			},

			'list/'(Model, req, res, next, opts) {
				const user = req.auth.user;

				_.promise(() => {
					if(mgHelpers.isWrongVerb(req, 'GET')) return;

					return Model.find({userId: user.id});
				})
					.then( results => {
						mgHelpers.sendFilteredResult(res, results);
					})
					.catch( err => $$$.send.error(res, err));

			},

			'remove/:crateID'(Model, req, res, next, opts) {
				const user = req.auth.user;
				const crateID = req.params.crateID | 0;

				_.promise(() => {
					if(mgHelpers.isWrongVerb(req, 'DELETE')) return;
					if(isNaN(crateID) || crateID<=0) throw 'Invalid LootCrate ID, cannot remove it.';

					return Model.remove({userId: user.id, id: crateID});
				})
					.then( removed => {
						const results = removed.toJSON();
						if(results.n<=0) throw `Could not remove LootCrate ID#${crateID} - either doesn't exist or belongs to another user.`;

						mgHelpers.sendFilteredResult(res, {
							isRemoved: true,
							numRemoved: results.n
						});
					})
					.catch( err => $$$.send.error(res, err));
			}
		},

		methods: {},

		///////////////////////////////////////////////////////////

		schema: {
			userId: CustomTypes.LargeInt({unique:false, required:true}),
			dateCreated: CustomTypes.DateRequired(),

			/////////////////////////////////// GAME-SPECIFIC:
			game: {
				explorationId: CustomTypes.LargeInt({default: -1}),
				crateTypeIdentity: CustomTypes.String32({required:true}),
				lootTableIdentity: CustomTypes.String32({required:true}),
				itemLevel: CustomTypes.Int({required: true}),
				variance: CustomTypes.Int({required: true}),
				magicFind: CustomTypes.Int({required: true}),
			}
		}
	};
};