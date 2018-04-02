require('./src/sv-globals');

const setupRoutes = require('./src/sv-setup-routes');
const setupMongo = require('./src/sv-setup-mongo-db');
const setupSocketIO = require('./src/sv-setup-socketio');
const setupWebDashboard = require('./src/web-dashboard/sv-setup-web-dashboard');
const setupWatcher = require('./src/sv-watcher');
const setupNodeMailer = require('./src/sv-setup-nodemailer');
const setupGithub = require('./src/sv-setup-github');
const JSONLoader = require('./src/sv-setup-json-loader');
const jsonConfig = { url: $$$.env.ini.JSON_URL, app: $$$.app, isParseGlobals: true };

$$$.jsonLoader = new JSONLoader();

//Run these first promises in parallel, and then...
Promise.all([
	setupRoutes(),
	setupMongo(),
	setupSocketIO(),
	setupWatcher(),
	setupNodeMailer(),
	setupGithub(),
	setupWebDashboard(),
	$$$.jsonLoader.config(jsonConfig)
])
	.then(setupMongo.createMongoModels) //Creates the models (see model-XXX.js under /src/models/)
	.then(setupRoutes.setTopLevelRoutes) //Creates the top-level / ending routes if nothing else routes them.
	.then(() => {
		// Finally once every promises passes, output some confirmation messages to the console
		trace([
				`Started SF-DEV on port ${$$$.env.ini.PORT} in environment`.cyan,
				`[${$$$.env().toUpperCase()}]`.magenta
			].join(' ')
		);

		//Oh, before we go, check if we should be running the Test Suites (CHAI)...
		if(!$$$.env.isTesting) return;

		//If our TEST flag is enabled, then continue with the CHAI test suite:
		require('./src/sv-setup-chai-tests')();
	})
	.catch( err => {
		//If any errors occur in the previous steps... show the error in the console!!!
		traceError("========= OH NO! ==========");
		trace(err);
	});


if(_.isTruthy($$$.env.isTesting)) {
	$$$.sockets = [];
	$$$.server.on('connection', socket => {
		$$$.sockets.push(socket);

		socket.on('close', () => {
			$$$.sockets.remove(socket);
		})
	});

	function onProgramExit() {
		const mongoose = require('mongoose');

		trace("mongoose.disconnect / connection.close()...");
		mongoose.disconnect();
		mongoose.connection.close();

		$$$.server.close();
		$$$.sockets.forEach(socket => socket.destroy());
	}

	process.on('exit', onProgramExit);
	process.on('SIGINT', onProgramExit);
}