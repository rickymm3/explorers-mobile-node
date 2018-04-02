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
	var User, Shop, Item, Hero, MsgReceipt, MsgSource;

	process.nextTick( () => {
		User = $$$.models.User;
		Shop = $$$.models.Shop;
		Item = $$$.models.Item;
		Hero = $$$.models.Hero;
		MsgReceipt = $$$.models.MessageReceipt;
		MsgSource = $$$.models.Message;
	});

	function makeErrorCallback(res, opts) {
		if(!opts) opts = {};
		return err => $$$.send.error(res, opts.asString ? err.toString() : err);
	}

	return {
		plural: 'messages',

		customRoutes: {
			//////////////////////////////////////////////////////////////

			'get::list$'(Model, req, res, next, opts) {
				const results = {};
				MsgSource.find()
					.then(messages => {
						results.messages = messages;
						mgHelpers.sendFilteredResult(res, results);
					})
					.catch(makeErrorCallback(res));
			},

			'get::inbox$'(Model, req, res, next, opts) {
				const results = {};
				const user = req.auth.user;
				const now = new Date();
				const dateClaimedRecently = moment(now).subtract(1, 'hour');
				const lists = {receipts: null, messages:null, messageIds: null};

				_.promise(() => {
					return MsgReceipt.find({userId: user.id});
				})
					.then(receipts => {
						lists.receipts = receipts;
						lists.messageIds = receipts.map(r => r.game.messageId);

						const orClause = [
							{id: {$in: lists.messageIds}},
							{'game.isForEveryone':true}
						];

						const q = {
							'game.isPublished': true,
							'game.dateExpires': {$gte: now},
							$or: orClause
						};

						return MsgSource.find(q);
					})
					.then(messages => {
						lists.messages = messages;

						const inbox = messages.map(msg => {
							var g = msg.game;
							var rcp = lists.receipts.find(r => r.game.messageId===msg.id);
							return {
								header: {
									id: msg.id,
									sentFrom: msg.userId,
									title: g.title,
									type: g.type,
									isForEveryone: g.isForEveryone,
									dateExpires: g.dateExpires,
									dateSent: msg.dateCreated,
									reward: g.reward
								},
								hasReceipt: rcp!=null,
								receipt: rcp
							};
						}).filter(msg => {
							if(!msg.hasReceipt) return true;

							return !msg.receipt.game.isDeleted;
						});

						mgHelpers.sendFilteredResult(res, inbox);
					})
					.catch(makeErrorCallback(res));
			},

			'put::open/:messageId/*'(Model, req, res, next, opts) {
				const results = {};
				const user = req.auth.user;
				const messageId = parseInt(req.params.messageId);
				const now = new Date();
				var msg;

				_.promise(() => {
					if(!messageId || isNaN(messageId)) throw 'Invalid "messageId" in URL request.';

					return MsgSource.find({id: messageId});
				})
					.then(messages => {
						if(!messages || !messages.length) throw `Message id#${messageId} does not exists.`;

						if(messages.length>1) throw `Critical error, found more than one matching Message with id: ` + messageId;

						msg = results.message = messages[0];

						const q = {userId: user.id, 'game.messageId': messageId};
						return MsgReceipt.findOne(q);
					})
					.then(receipt => {
						if (!receipt) {
							receipt = new MsgReceipt();
							receipt.userId = user.id;
							receipt.dateCreated = now;

							_.extend(receipt.game, {
								messageId: messageId,
								sentFrom: msg.userId,
								isDeleted: false,
								isClaimed: false,
								dateClaimed: null
							});
						} else if(receipt.game.isDeleted) {
							throw 'Cannot perform actions on deleted message: ' + messageId;
						}

						results.receipt = receipt;

						req.results = results;

						next();
					})
					.catch(makeErrorCallback(res));
			},

			'put::open/:messageId/read'(Model, req, res, next, opts) {
				const results = req.results;
				const receipt = results.receipt;
				const message = results.message;

				_.promise(() => {
					if(!receipt.game.isRead) {
						//Only mark the dateRead time-stamp the first time the message is read.
						_.extend(receipt.game, {
							isRead: true,
							dateRead: new Date()
						});
					}

					return receipt.save();
				})
					.then(saved => {
						results.receipt = saved;

						return mgHelpers.sendFilteredResult(res, results);
					})
					.catch(makeErrorCallback(res));
			},

			'put::open/:messageId/delete'(Model, req, res, next, opts) {
				const results = req.results;
				const receipt = results.receipt;
				const message = results.message;

				_.promise(() => {
					_.extend(receipt.game, {
						isDeleted: true,
						dateDeleted: new Date()
					});

					return receipt.save();
				})
					.then(saved => {
						//results.receipt = saved;
						return mgHelpers.sendFilteredResult(res, {ok: 1, isDeleted: 1});
					})
					.catch(makeErrorCallback(res));
			},

			'put::open/:messageId/claim'(Model, req, res, next, opts) {
				const results = req.results;
				const receipt = results.receipt;
				const message = results.message;
				const g = receipt.game;

				_.promise(() => {
					if(!g.isRead) throw 'Cannot claim a reward without reading message first!';
					if(g.isClaimed) throw 'Reward already claimed!';
					if(message.game.type.toUpperCase()==='GENERIC MESSAGE') throw 'Cannot reward on messages of type: GENERIC MESSAGE';

					_.extend(receipt.game, {
						isClaimed: true,
						dateClaimed: new Date()
					});

					return receipt.save();
				})
					.then(saved => {
						results.receipt = saved;
						results.reward = message.reward;

						return mgHelpers.sendFilteredResult(res, results);
					})
					.catch(makeErrorCallback(res));
			},

			'send'(Model, req, res, next, opts) {
				$$$.send.notImplemented(res);
			},

			'post::add'(Model, req, res, next, opts) {
				const msg = new MsgSource();
				const params = opts.data;
				const user = req.auth.user;

				_.promise(() => {
					if(!params || !params.game) {
						throw 'Missing request body with a "game" field.';
					}

					msg.userId = user ? user.id : -1;
					msg.dateCreated = new Date();
					_.merge(msg.game, params.game);

					return msg.save();
				})
					.then(saved => {
						mgHelpers.sendFilteredResult(res, saved);
					})
					.catch(makeErrorCallback(res, {asString:true}));
			},
		},

		///////////////////////////////////////////////////////////

		schema: {
			userId: CustomTypes.LargeInt({unique:false, required:true}),
			dateCreated: CustomTypes.DateRequired(),

			/////////////////////////////////// GAME-SPECIFIC:
			game: {
				jobID: CustomTypes.StringCustom(128),
				jobName: CustomTypes.StringCustom(128),
				title: CustomTypes.StringCustom(128, {required:true}),
				message: CustomTypes.StringCustom(1024, {required:true}),
				imageURL: CustomTypes.StringCustom(1024),
				type: CustomTypes.StringCustom(64, {required:true}),

				// TODO: Get the DM (Direct Messages) working for specific users:
				destinations: [CustomTypes.LargeInt()],

				// TODO: Get the DM (Direct Messages) working for groups of users:
				destinationGroups: [CustomTypes.LargeInt()],

				dateExpires: CustomTypes.DateRequired(),

				//Not really required anymore, the CRON-Job decides when to publish the message.
				//dateToPublish: CustomTypes.DateRequired(),

				//For scheduled messages, they can only be 'read' once this flag is true.
				isPublished: CustomTypes.Bool(false),

				//To mark system-wide / dev messages (as opposed to other users)
				isForEveryone: CustomTypes.Bool(false),

				/**
				 * Specify what type of item / prize can be claimed.
				 *
				 * If it's a limited-time offer item, a costType / costAmount
				 * can be specified. Otherwise, if it's free, those fields can be
				 * left blank.
				 */

				reward: {
					item: CustomTypes.StringCustom(1024), // Potentially long JSON/CSV data.
					costType: CustomTypes.String64(64), //Gold, Gems, Shards, etc.
					costAmount: CustomTypes.Int(), //Number
				},
			}
		}
	};
};