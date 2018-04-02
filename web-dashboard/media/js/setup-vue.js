var trace = window.trace.makeLogger('VUE', '#0a4');

import vSelect from 'vue-select';
import MyComponents from './vue-components.js';

function registerComponents(comps) {
	_.keys(comps).forEach(compName => {
		var comp = MyComponents[compName];

		if(!comp.noDiv) {
			comp.template = `<div class="${compName}">${comp.template}</div>`;
		}


		var MyComp = Vue.extend(comp);

		Vue.component(compName, MyComp);
	});
}

registerComponents(MyComponents);

Vue.component('v-select', vSelect);

var __CRON_JOBS, __SPINNER, __GOOGLEDATA;

function init() {
	$$$.vue = new Vue({
		el: '#app',
		props: ['currentJob'],
		data: {
			jobTypes: ['Generic Message', 'LootCrate Reward', 'Currency Reward'],
			cronJobs: [],
			googleData: {},
			helper: {
				filterByPrefix: 'lt_mail',
				isFilterByPrefix: false,
				currencyCategory: 'currency',
				currencyCategories: ['currency', 'boost'],

				currency: {
					amount:1,
					type: 'GOLD'
				},

				lootCrate: {
					crateTypeIdentity: '',
					lootTableIdentity: '',
					itemLevel: 1,
					variance: 1,
					magicFind: 1
				}
			}
		},

		computed: {
			validLootTables() {
				var results = this.googleData.lootTables;

				if(this.helper.isFilterByPrefix) {
					results = results.filter(a => a.startsWith(this.helper.filterByPrefix));
				}
				return results;
			},

			crateTypeIdentityInfo() {
				const lootCrate = this.helper.lootCrate;
				const id = lootCrate.crateTypeIdentity;
				if(!lootCrate || !__GOOGLEDATA.crateTypes.has(id)) return '*not-available*';

				const crateType = __GOOGLEDATA.sheets['crate-types']['data'].find(c => c.identity===id);
				const results = {};
				_.keys(crateType).forEach(key => {
					const value = crateType[key];
					results[key] = typeof(value)==='string' ? decodeURIComponent(value).replace(/\n/g,"<br/>") : value;
				});

				return JSON.stringify(results, null, '  ');
			},

			lootTableIdentityInfo() {
				const lootCrate = this.helper.lootCrate;
				const id = lootCrate.lootTableIdentity;
				if(!lootCrate || !__GOOGLEDATA.lootTables.has(id)) return '*not-available*';

				const crateType = __GOOGLEDATA.sheets['loot-tables']['data'].find(c => c.identity===id);
				const results = {};
				_.keys(crateType).forEach(key => {
					const value = crateType[key];
					results[key] = typeof(value)==='string' ? decodeURIComponent(value).replace(/\n/g,"<br/>") : value;
				});

				return JSON.stringify(results, null, '  ');
			},

			categoryCurrencyList() {
				switch(this.helper.currencyCategory) {
					case 'currency': return __GOOGLEDATA.currency;
					case 'boost': return __GOOGLEDATA.boosts;
				}
			}
		},

		methods: {
			getJobClasses(job) {
				return ['job', 'job-' + job.id, this.currentJob===job ? 'selected' : ''];
			},

			getToggleIcon(prop, job) {
				if(!job) job = this.currentJob;
				return job[prop] ? 'circle is-on' : 'circle-o is-off';
			},

			getPublishedDate(job) {
				if(!job) job = this.currentJob;
				var date = new Date(job.published.dateLast);
				return job.published.dateLast ? date.toLocaleString() : '';
			},

			onToggle(prop, job) {
				if(!job) job = this.currentJob;
				job[prop] = !job[prop];
				this.onSave(job);
			},

			onJobSelected(job) {
				if(!job.reward) {
					job.reward = {item:''};
				}

				this.currentJob = job;
			},

			onJobAdd() {
				var numJobs = __CRON_JOBS.length;
				var job = {
					id: _.guid(),
					name: 'Job #' + numJobs,
					isActive: false,
					dateChanged: new Date(),
					dateActiveSince: new Date(),
					published: {
						numTotal: 0,
						dateLast: null,
					},
					schedule: 'Every 2 seconds',
					dateExpiresIn: '1 day',
					title: 'YOUR_TITLE_HERE ' + numJobs,
					message: 'YOUR_MESSAGE_HERE ' + numJobs,
					imageURL: 'sword-ref',
					type: 'Generic Message',
					reward: { item: '' }
				};

				__CRON_JOBS.push( job );
				this.currentJob = job;

				this.onSave();
			},

			onSave(job) {
				if(!job) job = this.currentJob;
				if(job) job.dateChanged = new Date();

				__SPINNER.startBusy(0.5, 0.250, () => {
					_.writeJSON('./json/cron-jobs', __CRON_JOBS)
						.then(data => __SPINNER.stopBusy())
						.catch(err => __SPINNER.stopBusy());
				});
			},

			onDelete() {
				const id = this.currentJob.id;
				const found = __CRON_JOBS.find(job => job.id===id);
				__CRON_JOBS.remove(found);

				this.onSave();

				this.currentJob = __CRON_JOBS.length>0 ? __CRON_JOBS[0] : null;
			},

			onSendDM() {
				traceError("Sending DMs is not ready yet.");
			},

			onHelperUseCurrency() {
				var currency = this.helper.currency;
				this.currentJob.reward.item = currency.type.toLowerCase() + "=" + currency.amount;
			},

			onHelperUseLootCrate() {
				var lootCrate = this.helper.lootCrate;
				var keys = _.keys(lootCrate)
						.map(k => k + '=' + lootCrate[k]);

				this.currentJob.reward.item = keys.join('\n');
			},

			onCurrencyCategoryChange() {
				this.helper.currency.type = this.categoryCurrencyList[0];
			}
		}
	});

	$('.init-hidden').removeClass('init-hidden');

	__SPINNER = new Spinner();

	loadGoogleData()
		.then((data) => {
			var sheets = data.sheets;

			__GOOGLEDATA = $$$.vue.googleData = data;
			__GOOGLEDATA.preset1 = data.globals['preset-1'];
			__GOOGLEDATA.keys = _.keys(__GOOGLEDATA.preset1);
			__GOOGLEDATA.currency = __GOOGLEDATA.keys.filter(k => /^(GOLD|GEMS|MAGIC_ORBS|SHARDS|SCROLLS|ESSENCE|RELICS|BOOST)/g.test(k))
			__GOOGLEDATA.lootTables = getIdentitiesOf('loot-tables');
			__GOOGLEDATA.crateTypes = getIdentitiesOf('crate-types');
			__GOOGLEDATA.boosts = getIdentitiesOf('boosts');

			trace(__GOOGLEDATA);

			const currency = $$$.vue.helper.currency;
			const lootCrate = $$$.vue.helper.lootCrate;

			currency.type = __GOOGLEDATA.currency[0];
			lootCrate.crateTypeIdentity = __GOOGLEDATA.crateTypes[0];
			lootCrate.lootTableIdentity = __GOOGLEDATA.lootTables[0];

			function getIdentitiesOf(field) {
				return sheets[field]['data'].map(entry => entry.identity);
			}

			return loadCronJobs();
		})
		.then(() => {
			$$$.vue.$forceUpdate();
		})
}

init();

function loadCronJobs() {
	return new Promise((resolve, reject) => {
		__SPINNER.startBusy(0.5, 0.5, () => {
			_.loadJSON('./json/cron-jobs')
				.then(data => {
					__SPINNER.stopBusy();

					if(!data || !data.cronJobs) {
						return _.alert('JSON data is invalid!', 'Missing CRON Jobs!');
					}

					__CRON_JOBS = $$$.vue.cronJobs = data.cronJobs;

					if(__CRON_JOBS && __CRON_JOBS.length>0) {
						$$$.vue.onJobSelected(__CRON_JOBS[0]);
					}
					resolve();
				})
				.catch(err => {
					__SPINNER.stopBusy();
					reject(err);
				})
		});
	});
}

function loadGoogleData() {
	return new Promise((resolve, reject) => {
		__SPINNER.startBusy(0.5, 0.5, () => {
			_.loadJSON('./json/sf-dev')
				.then(data => {
					__SPINNER.stopBusy();

					if(!data || !data.sheets) {
						return _.alert('JSON data is invalid!', 'Missing SHEETS in EC2 JSON data!');
					}

					resolve(data);
				})
				.catch(err => {
					traceError(err);
					__SPINNER.stopBusy();

					reject(err);
				})
		});
	});
}