/**
 * Created by Chamberlain on 8/29/2017.
 */

const gameHelpers = require('../sv-json-helpers');
const mgHelpers = require('../sv-mongo-helpers');
const changeCase = require('change-case');
const mongoose = mgHelpers.mongoose;
const Schema  = mongoose.Schema;
const Types  = Schema.Types;
const CustomTypes  = mongoose.CustomTypes;
const ObjectId = Types.ObjectId;
const CONFIG = $$$.env.ini;

module.exports = function() {
	var User, Shop, Item, Hero;

	process.nextTick( () => {
		User = $$$.models.User;
		Shop = $$$.models.Shop;
		Item = $$$.models.Item;
		Hero = $$$.models.Hero;

		Item.addItems = addItems;
	});

	function addItems(req, res, next, opts) {
		var heroID = 0;
		return mgHelpers.prepareAddRequest(Item, req, res, next, opts)
			.then( user => {
				heroID = opts.data.heroID;

				if(isNaN(heroID) || heroID<1) return user;

				return new Promise((resolve, reject) => {
					Hero.find({userId: user.id, id: heroID})
						.then(found => {
							if(!found || !found.length) {
								return reject(`Could not find hero #${heroID} for equipping added item.`);
							} else if(found.length!==1) {
								return reject(`Found more than one hero match (#${heroID} exists ${found.length} times) for equipping newly added item.`);
							}

							resolve(user);
						})
						.catch(err => reject(err));
				});
			})
			.then( user => {
				var jsonItems, jsonCurrencies, validIdentities;
				var list = opts.data.list, listCurrencies=[];

				try {
					jsonItems = gameHelpers.getItems();
					validIdentities = jsonItems.all.identities;
					jsonCurrencies = jsonItems.currency;
				} catch(err) {
					throw 'Issue reading the JSON "sf-dev" items, was a table renamed? ' + err.message;
				}

				list = list.filter(item => {
					const found = jsonCurrencies.find(currency => currency.identity === item.identity);
					if(found) {
						listCurrencies.push({currency:found, item: item});
						return false;
					}
					return true;
				});

				var isCurrencyChanged = false;

				//Now check if we have any currency-items to add to the user's currency table:
				if(listCurrencies.length) {

					const userCurrency = user.game.currency;

					listCurrencies.forEach(obj => {
						const item = obj.item;
						const currency = obj.currency;

						const currencyName = changeCase.camelCase(currency.type);

						if(currency.reward<1) throw "Currency Item's reward should be greater than zero!";
						userCurrency[currencyName] += currency.reward | 0;
					});

					isCurrencyChanged = true;
				}

				var invalidIdentities = [];
				const items = list.map(item => {
					if(!validIdentities.has(item.identity)) {
						invalidIdentities.push(item);
					}

					return { userId: user.id, game: item };
				});

				if(heroID>0) {
					trace("Equipping items to hero: " + items.length + " items to " + heroID);
					items.forEach(item => item.game.heroEquipped = heroID);
				}

				if(invalidIdentities.length) {
					throw "Some of the supplied item identities don't exists in game's JSON: " +
					invalidIdentities.map(n => n.identity).join(', ');
				}

				const getOldAndNewItems = () => Promise.all([Item.find({userId: user.id}), Item.create(items)]);

				return _.promise(() => isCurrencyChanged ? user.save() : true)
						.then(getOldAndNewItems)
						.then(oldAndNew => mgHelpers.makeNewestAndOldest(oldAndNew[1], oldAndNew[0]));
			});
	}

	return {
		plural: 'items',

		customRoutes: {
			//////////////////////////////////////////////////////////////

			'list$'(Model, req, res, next, opts) {
				mgHelpers.getAllByCurrentUser(Model, req, res, next, opts)
					.then(items => {
						mgHelpers.sendFilteredResult(res, items);
					})
					.catch(err => {
						$$$.send.error(res, err, "Could not get list of items for user ID: " + req.auth.user.id);
					})
			},

			'equipped-off$'(Model, req, res, next, opts) {
				opts.query = {'game.heroEquipped': 0};

				mgHelpers.getAllByCurrentUser(Model, req, res, next, opts)
					.then(items => {
						mgHelpers.sendFilteredResult(res, items);
					})
					.catch(err => {
						$$$.send.error(res, err, "Could not get list of items for user ID: " + req.auth.user.id);
					})
			},

			'equipped-on/:heroID?'(Model, req, res, next, opts) {
				const heroID = req.params.heroID;
				if(isNaN(heroID) || heroID < 1) {
					return $$$.send.error(res, new Error("Hero Error"), "Must provide a Hero ID greater-than ZERO (0). Want unequipped items? Use /item/equipped-off instead.");
				}

				opts.query = {'game.heroEquipped': heroID};

				mgHelpers.getAllByCurrentUser(Model, req, res, next, opts)
					.then(items => {
						mgHelpers.sendFilteredResult(res, items);
					})
					.catch(err => {
						$$$.send.error(res, err, "Could not get list of items for user ID: " + req.auth.user.id);
					})
			},

			'add'(Model, req, res, next, opts) {
				$$$.errorData = {gotHere: true};
				addItems(req, res, next, opts)
					.then(results => {
						mgHelpers.sendFilteredResult(res, results);
					})
					.catch(err => {
						const str = !$$$.errorData ? '' : JSON.stringify($$$.errorData);
						$$$.send.error(res, err, "Could not add items! " + str);
					});
			},

			':itemID/*'(Model, req, res, next, opts) {
				const itemID = req.params.itemID;
				const user = req.auth.user;
				_.promise(() => {
					if(!user) throw 'Unauthorized user';

					return Model.find({userId: user.id, id: itemID}).limit(1)
				})
					.then( validItem => {
						if(!validItem.length) throw 'Invalid item ID';
						req.validItem = validItem[0];
						req.opts = opts;

						next(); //Pass this down to next route actions:
					})
					.catch(err => {
						$$$.send.error(res, err);
					});


			},

			'put::/:itemID/unequip'(Model, req, res, next, opts) {
				const user = req.auth.user;
				const currency = user.game.currency;
				const validItem = req.validItem;
				const cost = opts.data.cost;
				const isForced = !!opts.data.force;

				_.promise(() => {
					if(!isForced) {
						if(mgHelpers.currency.isInvalid(cost, currency, true)) return;

						mgHelpers.currency.modify(cost, currency, -1);
					} else {
						return null;
					}
					return user.save();
				})
					.then( savedUser => {
						validItem.game.heroEquipped = 0;
						return validItem.save();
					})
					.then( savedItem => {
						mgHelpers.sendFilteredResult(res, savedItem);
					})
					.catch( err => {
						$$$.send.error(res, err);
					})
			},

			':itemID/equip-to/:heroID'(Model, req, res, next, opts) {
				const Hero = $$$.models.Hero;
				const user = req.auth.user;
				const heroID = req.params.heroID;
				const validItem = req.validItem;
				const results = {
					item: validItem,
					previousHeroID: validItem.game.heroEquipped,
				};

				var validHero;

				return _.promise(() => {
					if (mgHelpers.isWrongVerb(req, 'PUT')) return;

					return Hero.find({userId: user.id, id: heroID}).limit(1);
				})
					.then( heroes => {
						if(!heroes.length) throw 'Invalid hero ID';

						results.hero = validHero = heroes[0];

						validItem.game.heroEquipped = validHero.id;
						return validItem.save();
					})
					.then( savedItem => {
						mgHelpers.sendFilteredResult(res, results);
					})
					.catch( err => {
						$$$.send.error(res, err);
					});
			},

			':itemID/remove'(Model, req, res, next, opts) {
				const user = req.auth.user;
				const validItem = req.validItem;
				const results = {};

				mgHelpers.prepareRemoveRequest(req)
					.then(() => {
						return Model.remove({userId: user.id, id: validItem.id});
					})
					.then( removed => {
						results.removed = validItem.toJSON();

						mgHelpers.sendFilteredResult(res, results);
					})
					.catch(err => {
						$$$.send.error(res, err);
					});
			},

			'remove-all'(Model, req, res, next, opts) {
				const user = req.auth.user;
				const results = {};

				mgHelpers.prepareRemoveRequest(req)
					.then(q => {
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
		},

		methods: {
			toDebugID() {
				return this.game.identity+"#" + this.id;
			}
		},

		///////////////////////////////////////////////////////////

		schema: {
			userId: CustomTypes.LargeInt({unique:false, required:true}),
			dateCreated: CustomTypes.DateRequired(),

			/////////////////////////////////// GAME-SPECIFIC:
			game: {
				identity: CustomTypes.String128({required:true}),
				isResearched: {type: Boolean, default: false},
				isIdentified: {type: Boolean, default: false},
				heroEquipped: CustomTypes.LargeInt({default: 0, index: true}),

				randomSeeds: {
					quality: CustomTypes.LargeInt({default: 1}),
					affix: CustomTypes.LargeInt({default: 1}),
					itemLevel: CustomTypes.LargeInt({default: 1}),
					variance: CustomTypes.LargeInt({default: 1}),
				},

				//New (as of Nov. 2017)
				itemLevel: CustomTypes.LargeInt({default: 1}),
				variance: CustomTypes.LargeInt({default: 1}),
				magicFind: CustomTypes.Int({default: 1})
			}
		}
	};
};