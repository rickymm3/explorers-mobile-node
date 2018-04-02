/**
 * Created by Chamberlain on 10/30/2017.
 */
const events = require('events');
const later = require('later');
const auth = require('../routes/api/sv-auth');
const moment = require('moment');
var JOBS = [];

const CronJobsManager = new events();

_.extend(CronJobsManager, {
	validateJobs(jobsData, errors) {
		var isValid = true;
		function nope(because) {
			errors.push(because);
			isValid = false;
		}

		jobsData.forEach(job => {
			if(!job.id) nope("Missing Job ID #.");
			if(!CronJobsManager.resolveJobType(job)) nope("Invalid Job Type: " + job.type);
			if(!job.title || !job.title.trim().length) nope("Missing Job title.");
			if(!job.message || !job.message.trim().length) nope("Missing Job Message.");
			if(!job.schedule || !job.schedule.trim().length) nope("Missing Job Schedule.");

			const cronSchedule = later.parse.text(job.schedule);

			if(!cronSchedule || cronSchedule.error>-1) {
				nope("Error in Schedule field at character " + cronSchedule.error);
			}
		});

		return isValid;
	},

	checkAll(data) {
		var jobsNew = data.cronJobs;

		jobsNew.forEach( jobNew => {
			var job = JOBS.find( j => j.id===jobNew.id );

			if(!job) return CronJobsManager.startJob(jobNew);

			if(job.dateChanged===jobNew.dateChanged) {
				return;
			}

			CronJobsManager.updateJob(job, jobNew);
		});

		//Remove any jobs that are no longer active:
		JOBS.forEach( job => {
			var found = jobsNew.find(j => j.id===job.id);
			if(found) return;

			CronJobsManager.stopJob(job);
		});
	},

	startJob(jobNew) {
		//trace("Starting job: ".yellow + jobNew.id);
		JOBS.push(jobNew);

		if(isNaN(jobNew.published.numTotal)) {
			jobNew.published.numTotal = 0;
		}

		CronJobsManager.emit('job-start', jobNew);
		CronJobsManager.updateJob(jobNew);
	},

	updateJob(job, jobNew) {
		//trace("Updating job: ".green + job.id);

		if(jobNew) _.merge(job, jobNew);

		CronJobsManager.stopJob(job);

		if(!job.isActive) {
			CronJobsManager.emit('job-inactive', jobNew);
			return trace(`Job #${job.id} is OFF`.bgRed);
		}

		CronJobsManager.emit('job-active', jobNew);
		trace(`Job #${job.id} is ON`.bgGreen);

		const cronSchedule = later.parse.text(job.schedule);
		if(cronSchedule.error>-1) {
			return traceError('Could not start the new job with the schedule expression: ' + job.schedule);
		}

		job._cron = later.setInterval(() => CronJobsManager.onJobPublished(job), cronSchedule);

		if(job.isExecuteOnStart) {
			CronJobsManager.onJobPublished(job);
		}
	},

	onJobPublished(job) {
		const typeMethod = CronJobsManager.resolveJobType(job);
		if(!typeMethod) return;

		typeMethod(job);

		const pub = job.published;
		pub.numTotal++;
		pub.dateLast = new Date();
		CronJobsManager.emit('job-published', job);

		if(pub.limit>-1 && pub.numTotal>=pub.limit) {
			CronJobsManager.stopJob(job);
		}
	},

	resolveJobType(job) {
		var type = job.type.toUpperCase().replace(/ /g, '_');
		return CronJobsManager.JOB_TYPES[type];
	},

	stopJob(job) {
		if(!job._cron || !job._cron.clear) return;

		job._cron.clear();
		job._cron = null;
	},

	prepareMessageData(job) {
		//trace("Generic...");
		var expireSplit = job.dateExpiresIn.trim().split(' ');
		var expireAmount = expireSplit[0] | 0;
		var expireUnits = expireSplit[1];
		var dateExpires = moment().add(expireAmount, expireUnits);

		return {
			game: {
				jobName: job.name,
				jobID: job.id,
				title: job.title,
				message: job.message,
				imageURL: job.imageURL,
				dateExpires: dateExpires,
				type: job.type,
				reward: job.reward,
				isPublished: true,
				isForEveryone: true
			},
		};
	},

	sendMessage(data) {
		return $$$.send.api('/message/add', 'POST', {body: data})
			.then( data => {
				trace(data);
			})
			.catch(err => {
				traceError("CRON-JOB ERROR: " + (err.message || err));
				CronJobsManager.emit('job-error', err);
			});
	},

	JOB_TYPES: {
		GENERIC_MESSAGE(job) {
			const data = CronJobsManager.prepareMessageData(job);

			CronJobsManager.sendMessage(data);
		},

		LOOTCRATE_REWARD(job) {
			const data = CronJobsManager.prepareMessageData(job);

			CronJobsManager.sendMessage(data);
		},

		CURRENCY_REWARD(job) {
			const data = CronJobsManager.prepareMessageData(job);

			CronJobsManager.sendMessage(data);
		}
	}
});

module.exports = CronJobsManager;