/**
 * Created by Chamberlain on 9/20/2017.
 */
var git = require('git-rev-sync');
var gitInfo = {};

module.exports = function() {
	return new Promise((resolve, reject) => {
		gitInfo.short = git.short();
		gitInfo.long = git.long();
		gitInfo.branch = git.branch();
		gitInfo.date = git.date();
		gitInfo.message = git.message();

		$$$.gitInfo = gitInfo;
		trace('GITHUB: '.yellow + 'Init.');
		//trace('GITHUB Info: ' + JSON.stringify(gitInfo));
		resolve(gitInfo);
	});
};