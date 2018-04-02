/**
 * Created by Chamberlain on 10/27/2017.
 */
const webdash = $$$.webdash = {};
const fs = require('fs-extra');
const CronJobsManager = require('./sv-cron-jobs-manager');

function setupWebDashboard() {
	trace("WEB-DASHBOARD: ".yellow + "Init.");

	//Create a Socket.IO namespace reserved for the web-dashboard:
	webdash.io = $$$.io.of('/web-dashboard');

	webdash.__public = $$$.paths.__dir + '/web-dashboard';
	webdash.__cronJobs = $$$.paths.__data + '/cron-jobs.json';

	loadJSONData()
		.then(startAllJobs);

	webdash.route = $$$.express.Router();

	if($$$.isDev) require('./sv-webpack-hot-reload')(webdash);

	webdash.route.use('/', $$$.express.static(webdash.__public));
	webdash.route.use('/public', $$$.express.static($$$.paths.__public));
	webdash.route.use('/json/*', (req, res, next) => {
		res.header('content-type', 'application/json');
		next();
	});

	webdash.route.get('/json/sf-dev', (req, res, next) => {
		res.send({sheets: $$$.jsonLoader.data.sheets, globals: $$$.jsonLoader.globals});
	});

	webdash.route.use('/json/cron-jobs', (req, res, next) => {
		if(webdash.JSON_DATA) return next();
		$$$.send.error(res, 'CRON-Jobs JSON isn\'t loaded yet.');
	});

	webdash.route.get('/json/cron-jobs', (req, res, next) => {
		res.send(webdash.JSON_DATA);
	});

	webdash.route.post('/json/cron-jobs', (req, res, next) => {
		const reasonsInvalid = [];

		if(!CronJobsManager.validateJobs(req.body, reasonsInvalid)) {
			return $$$.send.error(res, 'Some jobs are invalid: ' + reasonsInvalid.join('\n<br/>'));
		}

		webdash.JSON_DATA.cronJobs = req.body;

		CronJobsManager.checkAll(webdash.JSON_DATA);

		writeJSONData()
			.then(() => res.send({ok:1}))
			.catch(err => {
				$$$.send.error(res, 'Could not write the CRON-JOBS JSON data.');
			});
	});

	$$$.app.use('/web-dashboard', webdash.route);


	const writeDataPeriodically =
		new TimedDirtyFlag({
			secondsInterval: 10,
			onDirty() {
				trace("Writing current JSON-DATA...");
				writeJSONData();
			}
		});

	CronJobsManager.on('job-published', job => {
		webdash.io.emit('job-published', job);

		writeDataPeriodically.isDirty = true;
	});

	CronJobsManager.on('job-error', err => {
		webdash.io.emit('job-error', err);
	});
}

function loadJSONData() {
	return new Promise((resolve, reject) => {
		const defaultData = { cronJobs:[] };

		$$$.files.ensureDirExists(webdash.__cronJobs);

		if(fs.existsSync(webdash.__cronJobs)) {
			$$$.files.readJSON(webdash.__cronJobs)
				.then(data => {
					webdash.JSON_DATA = data;
					resolve();
				})
				.catch(err => {
					webdash.JSON_DATA = defaultData;
				});
		} else {
			webdash.JSON_DATA = defaultData;
			resolve();
		}
	})
}

function writeJSONData() {
	if(!webdash.JSON_DATA) return;

	return $$$.files.writeJSON(webdash.__cronJobs, webdash.JSON_DATA, true);
}

function startAllJobs() {
	trace("Starting all CRON-JOBS:".bgGreen + ' ' + webdash.JSON_DATA.cronJobs.length);
	CronJobsManager.checkAll(webdash.JSON_DATA);
}


module.exports = setupWebDashboard;