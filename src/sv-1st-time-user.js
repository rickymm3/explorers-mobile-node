/**
 * Created by Chamberlain on 1/9/2018.
 */

const gameHelpers = require('./sv-json-helpers');

const getFirstResearchSlot = user => ({userId: user.id, 'game.trayID': 0, 'game.slotID': 0});

const FIRST_TIME = module.exports = {
	preInit(user, data) {
		const g = gameHelpers.getJSONGlobals();

		data.game = {
			currency: {
				gold: g.GOLD,
				gems: g.GEMS,
				magicOrbs: g.MAGIC_ORBS,

				scrollsIdentify: g.SCROLLS_IDENTIFY,
				scrollsSummonCommon: g.SCROLLS_SUMMON_COMMON,
				scrollsSummonRare: g.SCROLLS_SUMMON_RARE,
				scrollsSummonMonsterFire: g.SCROLLS_SUMMON_MONSTER_FIRE,
				scrollsSummonMonsterWater: g.SCROLLS_SUMMON_MONSTER_WATER,
				scrollsSummonMonsterNature: g.SCROLLS_SUMMON_MONSTER_NATURE,
				scrollsSummonMonsterLight: g.SCROLLS_SUMMON_MONSTER_LIGHT,
				scrollsSummonMonsterDark: g.SCROLLS_SUMMON_MONSTER_DARK,

				shardsItemsCommon: g.SHARDS_ITEMS_COMMON,
				shardsItemsMagic: g.SHARDS_ITEMS_MAGIC,
				shardsItemsRare: g.SHARDS_ITEMS_RARE,
				shardsItemsUnique: g.SHARDS_ITEMS_UNIQUE,

				shardsXPCommon: g.SHARDS_XP_COMMON,
				shardsXPMagic: g.SHARDS_XP_MAGIC,
				shardsXPRare: g.SHARDS_XP_RARE,
				shardsXPUnique: g.SHARDS_XP_UNIQUE,

				essenceLow: g.ESSENCE_LOW,
				essenceMid: g.ESSENCE_MID,
				essenceHigh: g.ESSENCE_HIGH,

				relicsSword: g.RELIC_SWORD,
				relicsShield: g.RELIC_SHIELD,
				relicsStaff: g.RELIC_STAFF,
				relicsBow: g.RELIC_BOW,
			}
		};

		data.username = data.username.toLowerCase();
		data._password = (data._password || $$$.md5(data.password)).toLowerCase();

		_.extend(user, data);

		return user.save();
	},

	postInit(user, data) {
		//const slotPromise = FIRST_TIME.defaultResearchSlot(user);

		return Promise.all([user.save()]); //Promise.all([, slotPromise]);
	},

	defaultResearchSlot(user) {
		const ResearchSlot = $$$.models.ResearchSlot;

		return ResearchSlot.findOrCreate(getFirstResearchSlot(user))
			.then(slot => {
				const slotFirst = slot.doc;
				slotFirst.userId = user.id;
				slotFirst.game.trayID = 0;
				slotFirst.game.slotID = 0;
				slotFirst.unlock();

				return slotFirst.save();
			});
	},

	sanitizeUser(user) {
		return new Promise((resolve, reject) => {
			const ResearchSlot = $$$.models.ResearchSlot;

			ResearchSlot.find(getFirstResearchSlot(user))
				.then(results => {
					if(!results.length) {
						return FIRST_TIME.defaultResearchSlot(user);
					}
					return null;
				})
				.then(() => user.save())
				.then(() => resolve(user))
				.catch(err => reject(err));
		})


	}
}