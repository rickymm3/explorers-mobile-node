/**
 * Created by Chamberlain on 8/14/2017.
 */

const Mocha = require('mocha');
const path = require('path');
const chaiG = require('./sv-chai-globals');
const CONFIG = $$$.env.ini.MOCHA || {};
const regexTestFiles = new RegExp(CONFIG.TEST_FILE_PATTERN || '^test', 'i');
const mocha = new Mocha({bail:1}); //

module.exports = function start(onFinishTests) {
	function addTest(file, name) {
		if(!regexTestFiles.test(name)) return;
		mocha.addFile(file);
	}

	//Find and add all the tests JS files found in the /tests/ sub-folder:
	$$$.files.forEachJS($$$.paths.__tests, addTest, runTests);

	//Once tests are added, run the tests!
	function runTests() {
		// Run the tests.
		trace(" ................ Running Tests on api: ".green + $$$.paths.__api.green);

		mocha.run(function (failures) {
			onFinishTests && onFinishTests();
			process.on('exit', function () {
				process.exit(failures);  // exit with non-zero status if there were failures
			});
		});
	}
}