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
	var User, Shop, Item, Hero;

	process.nextTick( () => {
		User = $$$.models.User;
		Shop = $$$.models.Shop;
		Item = $$$.models.Item;
		Hero = $$$.models.Hero;
	});

	return {
		plural: 'heros',

		customRoutes: {
			//////////////////////////////////////////////////////////////

			'list$/'(Model, req, res, next, opts) {
				mgHelpers.getAllByCurrentUser(Model, req, res, next, opts)
					.then(items => {
						mgHelpers.sendFilteredResult(res, items);
					})
					.catch(err => {
						$$$.send.error(res, "Could not get list of heroes for user ID: " + req.auth.user.id, err);
					})
			},

			'list/available'(Model, req, res, next, opts) {
				const user = req.auth.user;

				_.promise(() => {
					if(mgHelpers.isWrongVerb(req, 'GET')) return;

					return Model.find({userId: user.id, 'game.exploringActZone': 0});
				})
					.then( heroes => {
						heroes = _.sortBy(heroes, 'id');
						mgHelpers.sendFilteredResult(res, heroes);
					})
					.catch( err => {
						$$$.send.error(res, "Could not list available heroes!", err);
					})
			},

			'add'(Model, req, res, next, opts) {
				const user = req.auth.user;
				const heroesDiscovered = user.game.analytics.heroesDiscovered;
				var heroes;

				mgHelpers.prepareAddRequest(Model, req, res, next, opts)
					.then( user => {
						const jsonHeroes = gameHelpers.getHeroes();
						const validIdentities = jsonHeroes.all.identities;

						var invalidIdentities = [];
						heroes = opts.data.list.map((game, i) => {
							if(!validIdentities.has(game.identity)) {
								invalidIdentities.push(game);
							}

							return {
								userId: user.id,
								dateCreated: moment().add(i,'ms'),
								game: game
							};
						});

						if(invalidIdentities.length) {
							throw "Some of the supplied hero identities don't exists in game's JSON: " +
								invalidIdentities.map(n => n.identity).join(', ');
						}

						//Analytics for Hero-Discovery tracking:
						heroes.forEach( hero => {
							const identity = hero.game.identity;
							const found = heroesDiscovered.find(heroKnown => heroKnown.identity===identity);

							if(found) {
								found.dateLastCounted = moment();
								return found.count++;
							}

							heroesDiscovered.push({identity: identity, count: 1});
						});

						return Promise.all([Hero.find({userId: user.id}), Hero.create(heroes), user.save()]);
					})
						.then( oldAndNew => {
							const results = mgHelpers.makeNewestAndOldest(oldAndNew[1], oldAndNew[0]);
							mgHelpers.sendFilteredResult(res, results);
						})
						.catch(err => $$$.send.error(res, "Could not add heroes!", err));
			},

			':heroID/*'(Model, req, res, next, opts) {
				const heroID = req.params.heroID;
				const user = req.auth.user;

				if(isNaN(heroID)) return next();

				Model.find({userId: user.id, id: heroID}).limit(1)
					.then( validHero => {
						if(!validHero.length) throw 'Invalid hero ID';
						req.validHero = validHero[0];

						next(); //Pass this down to next route actions:
					})
					.catch(err => {
						$$$.send.error(res, err);
					});
			},

			'put::/:heroID/xp'(Model, req, res, next, opts) {
				const validHero = req.validHero;

				_.promise(() => {
					if(isNaN(opts.data.xp)) throw 'Missing "xp" field in POST data.';

					validHero.game.xp = opts.data.xp | 0;
					return validHero.save();
				})
					.then(saved => mgHelpers.sendFilteredResult(res, saved))
					.catch(err => $$$.send.error(res, err));
			},

			'put::/:heroID/qualityLevel'(Model, req, res, next, opts) {
				const validHero = req.validHero;

				_.promise(() => {
					if(isNaN(opts.data.qualityLevel)) throw 'Missing "qualityLevel" field in POST data.';

					validHero.game.qualityLevel = opts.data.qualityLevel | 0;
					return validHero.save();
				})
					.then(saved => mgHelpers.sendFilteredResult(res, saved))
					.catch(err => $$$.send.error(res, err));
			},

			'put::/:heroID/exploring/:actZone'(Model, req, res, next, opts) {
				const user = req.auth.user;
				const validHero = req.validHero;
				const actZone = req.params.actZone;

				_.promise(() => {
					if(isNaN(actZone) || actZone < 1) throw 'Invalid actZone specified: ' + actZone;

					validHero.game.exploringActZone = actZone;
					return validHero.save();
				})
					.then(saved => mgHelpers.sendFilteredResult(res, saved))
					.catch(err => $$$.send.error(res, err));
			},

			':heroID/tap-ability'(Model, req, res, next, opts) {
				const user = req.auth.user;
				const validHero = req.validHero;
				var dateTapped = opts.data.dateTapped;

				_.promise(() => {
					if(mgHelpers.isWrongVerb(req, 'PUT')) return;
					if(!dateTapped) throw 'Missing param "dateTapped"!';

					if(_.isString(dateTapped)) {
						dateTapped = moment(dateTapped);
					}

					validHero.game.dateLastUsedTapAbility = dateTapped;
					return validHero.save();
				})
					.then(saved => {
						mgHelpers.sendFilteredResult(res, saved);
					})
					.catch(err => {
						$$$.send.error(res, err);
					});
			},

			':heroID/skill-levels'(Model, req, res, next, opts) {
				const user = req.auth.user;
				const validHero = req.validHero;
				const skillLevels = opts.data.skillLevels;

				_.promise(() => {
					if (mgHelpers.isWrongVerb(req, 'PUT')) return;

					validHero.game.skills = skillLevels;

					return validHero.save();
				})
					.then( saved => {
						mgHelpers.sendFilteredResult(res, saved);
					})
					.catch(err => {
						$$$.send.error(res, err);
					});
			},

			':heroID/rename'(Model, req, res, next, opts) {
				const user = req.auth.user;
				const validHero = req.validHero;
				const customName = opts.data.customName;

				_.promise(() => {
					if (mgHelpers.isWrongVerb(req, 'PUT')) return;

					validHero.game.customName = customName;

					return validHero.save();
				})
					.then( saved => {
						mgHelpers.sendFilteredResult(res, saved);
					})
					.catch(err => {
						$$$.send.error(res, err);
					});
			},

			':heroID/remove'(Model, req, res, next, opts) {
				const user = req.auth.user;
				const validHero = req.validHero;
				const Item = $$$.models.Item;
				const results = {};

				mgHelpers.prepareRemoveRequest(req, {'game.heroEquipped': validHero.id})
					.then(q => {
						return Item.updateMany(q, {$set: {'game.heroEquipped': 0}});

					})
					//TODO don't forget to set explorations to 0 too! (if they also refer to the Heroes)
					.then( items => {
						results.numItemsAffected = items.nModified;

						return Model.remove({userId: user.id, id: validHero.id});
					})
					.then( removed => {
						results.removed = validHero.toJSON();

						mgHelpers.sendFilteredResult(res, results);
					})
					.catch(err => {
						$$$.send.error(res, err);
					});
			},

			'put::/:heroID/swap-identity'(Model, req, res, next, opts) {
				const user = req.auth.user;
				const currency = user.game.currency;
				const cost = opts.data.cost;
				const jsonHeroes = gameHelpers.getHeroes();
				const validHero = req.validHero;
				const identityPrev = validHero.game.identity;
				const identityNext = opts.data.identity;

				_.promise(() => {
					// Validate whether or not we have a valid previous "identity" / "AwakenReference" to upgrade to the desired identity
					const heroDataPrev = jsonHeroes.find( hero => hero.identity === identityPrev);
					if(!heroDataPrev) throw `The Hero you're trying to swap FROM ${identityPrev} isn't even valid in the Heroes data sheet!`;

					const heroDataNext = jsonHeroes.find( hero => hero.identity === identityNext);
					if(!heroDataNext) throw `The Hero you're trying to swap TO ${identityNext} isn't even valid in the Heroes data sheet!`;

					const awakenReferencePrev = heroDataPrev['awaken-reference'];
					const awakenReferenceNext = heroDataNext['awaken-reference'];

					if(awakenReferenceNext !== awakenReferencePrev && awakenReferenceNext !== identityPrev) {
						throw `You cannot swap the identity of incompatible Heroes (FROM ${identityPrev} -> TO ${identityNext}) refer to the data sheet to make sure it's the right one!`;
					}

					// Verify we have enough currency to do the Identity Swap:
					if(mgHelpers.currency.isInvalid(cost, currency, true)) return;

					validHero.game.identity = identityNext;
					mgHelpers.currency.modify(cost, currency, -1);

					return Promise.all([user.save(), validHero.save()]);
				})
					.then(results => {
						mgHelpers.sendFilteredResult(res, {currency: results[0].game.currency, hero: results[1]});
					})
					.catch(err => {
						$$$.send.error(res, err);
					});
			},

			'remove-all'(Model, req, res, next, opts) {
				const user = req.auth.user;
				const Item = $$$.models.Item;
				const results = {};

				mgHelpers.prepareRemoveRequest(req)
					.then(q => {
						return Item.updateMany(q, {$set: {'game.heroEquipped': 0}});
					})
					.then( items => {
						results.numItemsAffected = items.nModified;
						return Model.remove({userId: user.id});
					})
					.then( removed => {
						results.numRemoved = removed.toJSON().n;

						mgHelpers.sendFilteredResult(res, results);
					})
					.catch(err => {
						$$$.send.error(res, err);
					});
			},

			'reset-exploration'(Model, req, res, next, opts) {
				const user = req.auth.user;

				_.promise(() => {
					if(mgHelpers.isWrongVerb(req, 'PUT')) return;

					// Reset heroes to zero (0)
					return Model.updateMany({userId: user.id}, {'game.exploringActZone': 0});
				})
					.then( updated => {
						mgHelpers.sendFilteredResult(res, updated);
					})
					.catch( err => $$$.send.error(res, err));
			}
		},

		methods: {
			toDebugID() {
				return this.game.identity+"#" + this.id;
			}
		},

		///////////////////////////////////////////////////////////

		schema: {
			userId: CustomTypes.LargeInt(),
			dateCreated: CustomTypes.DateRequired(),

			/////////////////////////////////// GAME-SPECIFIC:
			game: {
				customName: CustomTypes.StringCustom(24),
				xp: CustomTypes.LargeInt({required: true, default: 0}),
				identity: CustomTypes.String128({required:true}),
				exploringActZone: CustomTypes.Int({required:true, default: 0}),
				dateLastUsedTapAbility: CustomTypes.DateRequired(),
				qualityLevel: CustomTypes.Int({default: 0}),

				randomSeeds: {
					variance: CustomTypes.LargeInt({default: 1}),
				},

				skills: [
					new Schema({
						identity: CustomTypes.String32(),
						level: CustomTypes.Int({required: true, default: 0})
					}, {_id: false})
				]
			}
		}
	};
};