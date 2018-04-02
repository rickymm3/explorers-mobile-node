/**
 * Created by Chamberlain on 10/3/2017.
 */

const moment = require('moment');

class IntervalChecker {
	constructor(intervalStr, dateStart) {
		const intervalSplit = intervalStr.split(' ');

		this.interval = {
			amount: intervalSplit[0] | 0,
			unit: intervalSplit[1]
		};

		if(dateStart) {
			this.dateStart = _.isString(dateStart) ? moment(dateStart) : dateStart;
			trace("Starting IntervalChecker from date: " + this.dateStart.toISOString());
		} else {
			this.dateStart = moment(0);
		}

	}

	getValue() {
		const start = this.dateStart;
		const i = this.interval;
		const now = moment();
		const diff = now.diff(start, i.unit);
		const diffSteps = (diff / i.amount);
		const diffFloor = Math.floor(diffSteps);
		const diffCeil = diffFloor + 1;
		const dateCurrent = start.clone().add(diffFloor * i.amount, i.unit);
		const dateNext = start.clone().add(diffCeil * i.amount, i.unit);

		return { steps: diffSteps, dateCurrent: dateCurrent, dateNext: dateNext };
	}
}

module.exports = {
	IntervalChecker: IntervalChecker
};

