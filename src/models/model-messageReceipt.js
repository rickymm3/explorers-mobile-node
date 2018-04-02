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
	var User, Shop, Item, Hero, MsgTemplate;

	process.nextTick( () => {
		User = $$$.models.User;
		Shop = $$$.models.Shop;
		Item = $$$.models.Item;
		Hero = $$$.models.Hero;
		MsgTemplate = $$$.models.MessageTemplate;
	});

	return {
		plural: 'messageReceipts',

		customRoutes: {
			//////////////////////////////////////////////////////////////

			/**
			 * Leave the RESTFUL custom-routes blanks for message-receipts.
			 *
			 * The 'message' custom-routes will take care of directly interacting with
			 * the message-receipts collection table.
 			 */

			//////////////////////////////////////////////////////////////
		},

		schema: {
			userId: CustomTypes.LargeInt({unique:false, required:true}),
			dateCreated: CustomTypes.DateRequired(),

			/////////////////////////////////// GAME-SPECIFIC:
			game: {
				messageId: CustomTypes.LargeInt(),
				sentFrom: CustomTypes.LargeInt(),
				//dateExpires: CustomTypes.DateRequired(), //<-- Can be looked up on the Message source.

				// To indicate whether or not the user opened the message.
				isRead: CustomTypes.Bool(false),

				// Marks the date when this message was read.
				dateRead: Date,

				// To indicate whether or not the user deleted the message
				// (at least on his/her end, the message source will still exists for others to read).
				isDeleted: CustomTypes.Bool(false),
				dateDeleted: Date,

				// To indicate whether or not the user claimed the reward in the message (if applicable).
				isClaimed: CustomTypes.Bool(false),

				// Mark the date when a reward has been claimed
				// (that way we can keep it for disputes and/or filtering out of the inbox after (X) time).
				dateClaimed: Date,
			}
		}
	};
};