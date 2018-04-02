/**
 * Created by Chamberlain on 8/30/2017.
 */

const jsonLoader = $$$.jsonLoader;
var jsonSheets;

$$$.jsonLoader.onAndEmit('json-reloaded', () => {
	//Re-assign the newly requested set of Data Sheets in this top-scope variable:
	jsonSheets = jsonLoader.data.sheets;
});

module.exports = {
	getItems() {
		if(!$$$.errorData) $$$.errorData = {};

		$$$.errorData.validTableNames = _.keys(jsonSheets);

		const weapons = jsonSheets['item-weapons'].data;
		const armor = jsonSheets['item-armors'].data;
		const relic = jsonSheets['item-artifacts'].data;
		const currency = jsonSheets['item-currency'].data;
		const allItems = [].concat(weapons, armor, relic, currency);
		const allIdentities = allItems.map(item => item.identity);
		const allNames = allItems.map(item => item.name);

		currency.identities = currency.map(item => item.identity);

		return {
			weapon: weapons,
			armor: armor,
			relic: relic,
			currency: currency,

			all: {
				items: allItems,
				identities: allIdentities,
				names: allNames
			}
		};
	},

	getHeroes() {
		const jsonHeroes = jsonSheets['heroes'].data;

		//Make a copy of the Heroes data (Google Sheet) so we can add shortcut fields (like all, all.identities, all.names)
		var dup = [].concat(jsonHeroes);
		dup.all = {
			identities: jsonHeroes.map(hero => hero.identity),
			names: jsonHeroes.map(hero => hero.name)
		};

		return dup;
	},

	getJSONGlobals(preset) {
		if(!preset) preset = 'preset-1';

		return jsonLoader.globals[preset];
	},

	getShopItems() {
		const jsonShopItems = jsonSheets['shop-items-fixed'].data;
		return jsonShopItems;
	},

	getBoosts() {
		const jsonBoosts = jsonSheets['boosts'].data;
		return jsonBoosts;
	},

	getActZones() {
		const jsonActZones = jsonSheets['zones'].data;
		return {
			zones: jsonActZones,
			actZoneIDs: jsonActZones.map(zone => (zone['act-zone'] | 0))
		}
	}
}