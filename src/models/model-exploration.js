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
const moment = require('moment');

module.exports = function() {
	var User, Shop, Item, Hero, LootCrate, Exploration;

	/**
	 * Delay the models constants
	 *
	 * (because the for-loop iterating these model-files may not be
	 * aware at this instant of all $$$.models until the next cycle)
	 */
	process.nextTick( () => {
		User = $$$.models.User;
		Shop = $$$.models.Shop;
		Item = $$$.models.Item;
		Hero = $$$.models.Hero;
		LootCrate = $$$.models.Lootcrate;
		Exploration = $$$.models.Exploration;
	});

	return {
		plural: 'explorations',

		customRoutes: {
			//////////////////////////////////////////////////////////////

			':actZoneID'(Model, req, res, next, opts) {
				const user = req.auth.user;
				const actZoneID = req.params.actZoneID | 0;
				if(isNaN(actZoneID) || actZoneID<=0) return next();

				const jsonActZones = gameHelpers.getActZones();

				return _.promise(() => {
					if(opts.data.isAutoCreate) throw 'Not using isAutoCreate anymore.';

					if(!jsonActZones.actZoneIDs.has(actZoneID)) {
						throw 'Invalid ActZone, cannot create -or- update Exploration: ' + actZoneID;
					}

					return Exploration.find({userId: user.id, 'game.actZoneID': actZoneID});
				})
					.then( found => {
						if(!found || !found.length) {
							if(req.method==='POST') return next();

							throw 'User does not have an Exploration on ActZoneID: ' + actZoneID;
						}

						if(found.length>1) {
							throw 'User has more-than-1 exploration of the same ActZoneID! ' + actZoneID;
						}

						req.validActZone = found[0];

						return next();
					})
					.catch( err => {
						$$$.send.error(res, err)
					});
			},

			'get::/:actZoneID$'(Model, req, res, next, opts) {
				const user = req.auth.user;
				const validActZone = req.validActZone;
				if(!validActZone) return next();

				mgHelpers.sendFilteredResult(res, validActZone);
			},

			/////////////////////////////////////////////////////////
			///////////////////////////////////////////////////////// vvvvvvvvv

			'post::/:actZoneID/start'(Model, req, res, next, opts) {
				const user = req.auth.user;
				const existingExploration = req.validActZone;
				const exploreData = opts.data.exploration;
				const party = opts.data.party;
				const actZoneID = req.params.actZoneID | 0;
				const q = {userId: user.id}; //id: {$in: party}
				const results = {};

				const newExploration = new Model();
				newExploration.userId = user.id;
				newExploration.game.actZoneID = actZoneID;

				_.promise(() => {
					if(existingExploration) throw 'Seems like an exploration already exists for ActZone: ' + actZoneID;
					if(!exploreData.dateStarted) throw 'Missing "dateStarted" field in POST data.';
					if(!party || !_.isArray(party) || party.length===0) {
						throw 'Missing valid party information. '+
							  'Make sure to supply an array of 1 or more valid Hero IDs.';
					}

					return Hero.find(_.merge(q, {'game.exploringActZone': 0}));
				})
					.then( heroes => {
						var heroesInParty = heroes.filter(hero => party.has(hero.id));
						heroes = _.sortBy(heroes, 'id');
						heroesInParty = _.sortBy(heroesInParty, 'id');

						if(!heroesInParty || heroesInParty.length !== party.length) {
							const heroIDs = heroes.map(h => h.id);
							const heroInPartyIDs = heroesInParty.map(h => h.id);
							throw [
								'Not all Hero IDs provided match those the User currently has available:',
								'User Heroes: ' + heroIDs.sortNumeric(),
								'User Matching: ' + heroInPartyIDs.sortNumeric(),
								'Party IDs: ' + party.sortNumeric()
								].join('\n');
						}

						heroesInParty.forEach(h => h.game.exploringActZone = actZoneID);

						results.heroes = heroesInParty;

						const qInParty = _.merge(q, {id: {$in: party}});

						return Hero.updateMany(qInParty, {'game.exploringActZone': actZoneID});
					})
					.then( heroesUpdated => {
						results.numHeroes = heroesUpdated.n;
						results.numHeroesModified = heroesUpdated.nModified;

						newExploration.game.dateStarted = exploreData.dateStarted;
						newExploration.game.party = party;

						return newExploration.save();
					})
					.then( saved => {
						results.exploration = saved;

						mgHelpers.sendFilteredResult(res, results);
					})
					.catch(err => $$$.send.error(res, err));
			},

			///////////////////////////////////////////////////////// ^^^^^^^^^^^
			/////////////////////////////////////////////////////////

			'put::/:actZoneID/update'(Model, req, res, next, opts) {
				const user = req.auth.user;
				const exploreData = opts.data.exploration;

				_.promise(() => {
					if(mgHelpers.isWrongVerb(req, 'PUT')) return;
					if(!req.validActZone) throw 'Invalid ActZone (do you need to use isAutoCreate?)';
					if(!exploreData) throw 'Missing "exploration" in POST data.';
					if(mgHelpers.hasMissingFields(exploreData, 'accumulativeDamage,chests')) return;

					_.extend(req.validActZone.game, exploreData);

					return req.validActZone.save();
				})
					.then( saved => {
						mgHelpers.sendFilteredResult(res, saved);
					})
					.catch( err => $$$.send.error(res, err));
			},

			'delete::/:actZoneID/remove'(Model, req, res, next, opts) {
				const user = req.auth.user;
				const actZoneID = req.params.actZoneID | 0;
				const results = {isRemoved: true};

				_.promise(() => {
					if(isNaN(actZoneID) || actZoneID<=0) throw 'Invalid Exploration ID, cannot remove it.';

					return Exploration.remove({userId: user.id, 'game.actZoneID': actZoneID});
				})
					.then( removed => {
						removed = removed.toJSON();
						if(removed.n<=0) {
							throw	`Could not remove Exploration ID#${actZoneID} - ` +
									`either doesn't exist or belongs to another user.`;
						}

						results.numRemoved = removed.n;

						return Hero.updateMany({
							userId: user.id,

							// Only update the heroes that were attached to
							// this Exploration's Party:
							'game.exploringActZone': actZoneID
						}, {
							// Reset heroes to zero (0)
							'game.exploringActZone': 0
						});
					})
					.then(removed => {
						results.numHeroesReset = removed.n;

						mgHelpers.sendFilteredResult(res, results);
					})
					.catch( err => $$$.send.error(res, err));
			},

			'get::/list/'(Model, req, res, next, opts) {
				const user = req.auth.user;

				_.promise(() => {
					return Model.find({userId: user.id});
				})
					.then( results => {
						mgHelpers.sendFilteredResult(res, results);
					})
					.catch( err => $$$.send.error(res, err));

			},

			'delete::/remove-all/'(Model, req, res, next, opts) {
				const user = req.auth.user;
				const results = {};

				_.promise(() => {
					return Model.remove({userId: user.id});
				})
					.then( removed => {
						results.explorations = removed;

						return Hero.updateMany({
							userId: user.id,
						}, {
							'game.exploringActZone': 0 //Reset heroes to zero (0)
						});
					})
					.then( removed => {
						results.heroes = removed;

						mgHelpers.sendFilteredResult(res, results);
					})
					.catch( err => $$$.send.error(res, err));
			},
		},

		methods: {},

		///////////////////////////////////////////////////////////

		schema: {
			userId: CustomTypes.LargeInt({unique:false, required:true}),
			dateCreated: CustomTypes.DateRequired(),

			/////////////////////////////////// GAME-SPECIFIC:
			game: {
				dateStarted: CustomTypes.DateRequired(),
				party: [CustomTypes.LargeInt({default: -1})],
				accumulativeDamage: CustomTypes.LargeInt({required: true, default: 0}),
				chests: CustomTypes.Int({required: true, default: 0}),
				actZoneID: CustomTypes.Int({required:true, min: -1, default: -1}),
				//isCompleted: {type: Boolean, default: false},
				//dateLastVisited: CustomTypes.DateRequired(),
			}
		}
	};
};