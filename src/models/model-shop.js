/**
 * Created by Chamberlain on 8/29/2017.
 */

const gameHelpers = require('../sv-json-helpers');
const mgHelpers = require('../sv-mongo-helpers');
const mongoose = mgHelpers.mongoose;
const Schema  = mongoose.Schema;
const CustomTypes  = mongoose.CustomTypes;
const moment = require('moment');
const dateUtils = require('../sv-date-utils');



module.exports = function() {
	var User, Shop, Item, jsonGlobals;

	process.nextTick( () => {
		User = $$$.models.User;
		Shop = $$$.models.Shop;
		Item = $$$.models.Item;
	});

	const shopConfig = {isRoundedHours: false, expires: null};
	const featuredItem = {config: null, interval: null, lastCheck: null, seed: 0};

	$$$.jsonLoader.onAndEmit('json-reloaded', () => {
		jsonGlobals = $$$.jsonLoader.globals['preset-1'];
		shopConfig.isRoundedHours = _.isTruthy(jsonGlobals.SHOP_REFRESH_ROUNDED);

		const expireSplit = decodeURIComponent(jsonGlobals.SHOP_REFRESH_KEY_EXPIRES).split(" ");
		shopConfig.expires = {
			time: expireSplit[0] | 0,
			unit: expireSplit[1]
		};

		trace(shopConfig);

		setFeaturedItemIntervals();
	});

	setInterval(checkUpdateFeaturedItem, 1000);


	function setFeaturedItemIntervals() {
		const interval = decodeURIComponent(jsonGlobals.FEATURED_ITEM_INTERVAL);
		const startTime = decodeURIComponent(jsonGlobals.FEATURED_ITEM_START_TIME);
		const now = moment();

		var cfg = featuredItem.config = {
			_interval: interval,
			_startDate: moment(startTime)
		};

		featuredItem.interval = new dateUtils.IntervalChecker(cfg._interval, cfg._startDate);
	}

	function checkUpdateFeaturedItem() {
		const now = moment().subtract(1, 'second');
		const lastCheck = featuredItem.lastCheck;
		const diff = !lastCheck ? 0 : now.diff(lastCheck.dateNext);

		if(diff<0) return;

		featuredItem.lastCheck = featuredItem.interval.getValue();
		featuredItem.seed = (Math.random() * 2000000000) | 0;
	}

	function createFeatureResponse(dateLast) {
		dateLast = moment(dateLast);

		const dateCurrent = featuredItem.lastCheck.dateCurrent;
		const dateNext = featuredItem.lastCheck.dateNext;
		const diff = dateLast.diff(dateCurrent);

		return {
			seed: featuredItem.seed,
			isItemPurchased: diff > 0,
			dateCurrent: dateCurrent,
			dateNext: dateNext
		}
	}

	function createExpiryAndSecondsLeft(source) {
		if(!source) return null;
		const results = source.toJSON ? source.toJSON() : _.clone(source);
		const date = moment(source._dateGenerated);
		const expires = date.clone().add(shopConfig.expires.time, shopConfig.expires.unit);

		results.dateExpires = expires.toDate();
		results.secondsLeft = expires.diff(moment(), "seconds");
		return results;
	}

	function saveRefreshedKey(req) {
		const user = req.auth.user;
		const refreshKey = user.game.shopInfo.refreshKey; //.toJSON();
		const now = moment();


		refreshKey.seed = (Math.random() * 2000000) | 0;
		refreshKey._dateGenerated = shopConfig.isRoundedHours ? now.startOf('hour') : now;
		refreshKey.purchased = []; //Reset the purchases-indices

		req.shopSession.refreshKey = createExpiryAndSecondsLeft(refreshKey);

		return user.save();
	}


	checkUpdateFeaturedItem();

	return {
		plural: 'shop',

		customRoutes: {
			//////////////////////////////////////////////////////////////

			'*'(Model, req, res, next, opts) {
				const user = req.auth.user;
				const shopInfo = user.game.shopInfo;
				const refreshKey = createExpiryAndSecondsLeft(shopInfo.refreshKey);
				req.shopSession = { refreshKey: refreshKey };

				Model.find({userId: user.id, 'game.item.seed': refreshKey.seed })
					.then( purchases => {
						refreshKey.purchased = purchases.length==0 ? [] : purchases.map( i => i.game.item.index );

						if(refreshKey.secondsLeft < 0) {
							req.shopSession.isRefreshing = true;
							return saveRefreshedKey(req);
						}

						return user;
					})
					.then(() => next());
			},

			'key$'(Model, req, res, next, opts) {
				_.promise(() => {
					if(mgHelpers.isWrongVerb(req, 'GET')) return;

					if(req.shopSession.isRefreshing) {
						trace("Seconds left < 0, resetting to " + req.shopSession.refreshKey.secondsLeft);
					}

					mgHelpers.sendFilteredResult(res, req.shopSession);
				})
					.catch(err => $$$.send.error(res, err))
			},

			'key/refresh'(Model, req, res, next, opts) {
				const cost = opts.data.cost;
				const user = req.auth.user;
				const currency = user.game.currency;

				_.promise(() => {
					if(mgHelpers.isWrongVerb(req, 'PUT')) return;
					if(mgHelpers.currency.isInvalid(cost, currency, true)) return;

					mgHelpers.currency.modify(cost, currency, -1);

					return saveRefreshedKey(req);
				})
					.then(savedUser => {
						var results = _.extend({
							isRefreshed: true,
							currency: currency
						}, req.shopSession);

						mgHelpers.sendFilteredResult(res, results);
					})
					.catch(err => $$$.send.error(res, err))
			},

			'featured-item$/'(Model, req, res, next, opts) {
				const user = req.auth.user;
				const shopInfo = user.game.shopInfo;

				_.promise(() => {
					if(mgHelpers.isWrongVerb(req, 'GET')) return;

					mgHelpers.sendFilteredResult(res, createFeatureResponse(shopInfo.dateLastPurchasedFeaturedItem));
				})
					.catch(err => {
						$$$.send.error(res, err);
					})
			},

			'featured-item/buy'(Model, req, res, next, opts) {
				const user = req.auth.user;
				const shopInfo = user.game.shopInfo;
				const currency = user.game.currency;
				const results = { isItemPurchased: true };

				var itemCost, featureResponse;

				_.promise(() => {
					if(mgHelpers.isWrongVerb(req, 'POST')) return;

					featureResponse = createFeatureResponse(shopInfo.dateLastPurchasedFeaturedItem);
					if(featureResponse.isItemPurchased) throw 'Item is already purchased!';

					itemCost = opts.data.cost;
					if(!itemCost) throw ERROR_COST;

					if(mgHelpers.currency.isInvalid(itemCost, currency, true)) return;

					return Item.addItems(req, res, next, opts);
				})
					.then( itemResults => {
						mgHelpers.currency.modify(itemCost, currency, -1);

						results.item = itemResults.newest[0];
						results.currency = currency;

						shopInfo.dateLastPurchasedFeaturedItem = moment();

						return user.save();
					})
					.then( saved => {
						featureResponse = createFeatureResponse(shopInfo.dateLastPurchasedFeaturedItem);

						mgHelpers.sendFilteredResult(res, _.extend(results, featureResponse));
					})
					.catch(err => {
						$$$.send.error(res, err);
					})
			},

			'buy/item'(Model, req, res, next, opts) {
				const user = req.auth.user;
				const currency = user.game.currency;
				const indexAndSeed = opts.data.item;
				const refreshKey = req.shopSession.refreshKey;
				const results = { isItemPurchased: true };

				var itemCost;

				_.promise(() => {
					if(mgHelpers.isWrongVerb(req, 'POST')) return;
					if(!indexAndSeed) throw 'Missing "item" in POST data.';
					if(isNaN(indexAndSeed.index)) throw 'Missing "item.index" in POST data.';
					if(isNaN(indexAndSeed.seed)) throw 'Missing "item.seed" in POST data.';
					if(indexAndSeed.seed!==refreshKey.seed) {
						//trace(req.shopSession.refreshKey.seed);
						//trace('req.shopSession.refreshKey: '.red + itemData.seed + " is not equal (!=) " + refreshKey.seed );
						throw 'Incorrect "item.seed" used, does not match current refresh seed.';
					}

					itemCost = opts.data.cost;
					if(!itemCost) throw ERROR_COST;

					if(mgHelpers.currency.isInvalid(itemCost, currency, true)) return;

					return Model.find({
						userId: user.id,
						'game.item.index': indexAndSeed.index,
						'game.item.seed': indexAndSeed.seed,
					})
				})
					.then( existingItems => {
						if(existingItems && existingItems.length>0) {
							throw `You already purchased this item: {index: ${indexAndSeed.index}, seed: ${indexAndSeed.seed}}`;
						}

						//Add the items to the list:
						return Item.addItems(req, res, next, opts);
					})
					.then( itemResults => {
						mgHelpers.currency.modify(itemCost, currency, -1);

						if(itemResults.newest) {
							//TODO for multiple items, solve why the '_...' private properties leak through this!
							results.item = itemResults.newest[0];
						}

						const shopItem = new Model();
						shopItem.userId = user.id;
						shopItem.game = _.extend({
							item: indexAndSeed,
							cost: itemCost
						}, refreshKey);

						return Promise.all([
							user.save(),
							shopItem.save()
						]);
					})
					.then( savedUserAndShopItem => {
						results.currency = currency;
						results.shop = savedUserAndShopItem[1].toJSON();

						mgHelpers.sendFilteredResult(res, results);
					})
					.catch(err => $$$.send.error(res, err));
			},

			'sell/item$/'(Model, req, res, next, opts) {
				const user = req.auth.user;
				const currency = user.game.currency;
				const cost = opts.data.cost;
				const item = opts.data.item;
				const results = {isSold: true};

				_.promise(() => {
					if(mgHelpers.isWrongVerb(req, 'DELETE')) return;

					if(!item) throw 'Missing "item" field in POST data!';
					if(!item.id) throw 'Missing "item.id" field in POST data!';

					if(mgHelpers.currency.isInvalid(cost, currency, false)) return;

					mgHelpers.currency.modify(cost, currency, 1);

					return Promise.all([
						Item.remove({userId: user.id, id: item.id}),
						user.save()
					]);
				})
					.then( both => {
						const removalStatus = both[0].toJSON();

						//const userSaved = both[1];
						results.numItemsSold = removalStatus.n;
						results.currency = currency;
						mgHelpers.sendFilteredResult(res, results);
					})
					.catch(err => $$$.send.error(res, err));
			},

			//SELL MULTIPLE ITEMS!!!
			'sell/items$/'(Model, req, res, next, opts) {
				const user = req.auth.user;
				const currency = user.game.currency;
				const cost = opts.data.cost;
				const items = opts.data.items;
				const results = {isSold: true};

				_.promise(() => {
					if(mgHelpers.isWrongVerb(req, 'DELETE')) return;

					if(!items || !items.length) throw 'Missing "items" field in POST data!';
					if(!items[0]) throw 'Empty/null item found on "items[0]"!';
					if(!items[0].id) throw 'Missing "items[0].id" field in POST data!';

					if(mgHelpers.currency.isInvalid(cost, currency, false)) return;

					mgHelpers.currency.modify(cost, currency, 1);

					var allIDs = items.map((item, i) => {
						if(!item) throw 'One of the supplied items is null! ' + i;
						return item.id;
					});

					return Promise.all([
						Item.remove({userId: user.id, id: {$in: allIDs}}),
						user.save()
					]);
				})
					.then( both => {
						const removalStatus = both[0].toJSON();

						//const userSaved = both[1];
						results.numItemsSold = removalStatus.n;
						results.currency = currency;
						mgHelpers.sendFilteredResult(res, results);
					})
					.catch(err => $$$.send.error(res, err));
			},

			'put::expansion-slots'(Model, req, res, next, opts) {
				const user = req.auth.user;
				const currency = user.game.currency;
				const shopInfo = user.game.shopInfo;
				const cost = opts.data.cost;
				const expansionSlots = opts.data.expansionSlots;
				const limit = jsonGlobals.SHOP_EXPANSION_LIMIT;

				_.promise(() => {
					if(isNaN(expansionSlots)) throw 'Missing "expansionSlots" field in POST data.';
					if(expansionSlots < 0 || expansionSlots > limit) throw `"expansionSlots" value should be between 0 - ${limit}`;
					if(mgHelpers.currency.isInvalid(cost, currency, true)) return;

					mgHelpers.currency.modify(cost, currency, -1);

					shopInfo.expansionSlots = expansionSlots;

					return user.save();
				})
					.then( saved => {
						mgHelpers.sendFilteredResult(res, saved.game);
					})
					.catch( err => {
						$$$.send.error(res, err);
					})
			}
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
				//guid: CustomTypes.String128(),
				_dateGenerated: CustomTypes.DateRequired({default: new Date(0)}),

				item: {
					index: CustomTypes.Int({required: true}),
					seed: CustomTypes.LargeInt({min: -1, default: -1, required: true}),
				},

				cost: {
					gold: CustomTypes.Int(),
					gems: CustomTypes.Int(),
				}
			}
		}
	};
};