const trace = console.log.bind(console);
const cluster = require('cluster');
var args = [].slice.call(process.argv, 2);

//Test comment

function autoReload() {
	var persistent;

	function loopCluster() {
		if(!persistent) {
			trace(`Master (${process.pid}) started the child process...`);
			persistent = cluster.fork();
		}

		setTimeout(loopCluster, 250);
	}

	loopCluster();

	cluster.on('exit', (worker, code, signal) => {
		trace(`Worker ${worker.process.pid} died.`);
		persistent = null;
	});
}

switch(args[0]) {
	case 'test': process.env.isTesting = true;
	case 'cluster':
		if(!cluster.isMaster) break;
		return autoReload();

	case 'scratch': require('./scratch'); return;
	default: break;
}

require('./main');

