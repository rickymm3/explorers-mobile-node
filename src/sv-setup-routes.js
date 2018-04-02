/**
 * Created by Chamberlain on 8/10/2017.
 */

const session = require('express-session');
const bodyParser = require('body-parser');
const timeSecondMS = 1000;
const timeMinuteMS = 60 * timeSecondMS;
const timeHourMS = 60 * timeMinuteMS;
const timeDayMS = 24 * timeHourMS;

$$$.routes = {};

$$$.app.use(bodyParser.urlencoded({ extended: false }));
$$$.app.use(bodyParser.json());
$$$.app.set('trust proxy', 1);
$$$.app.use((req, res, next) => {
	//Attach 'dateRequested' on each requests
	req.dateRequested = new Date();
	next();
});

const morganLogger = require("./sv-setup-morgan-logger");
morganLogger.setupLogger($$$.app);

const http = require('http');

//Add methods to Request objects (Express's built-in type)
_.addProps( http.IncomingMessage.prototype, {
	'fullURL': {
		get() { return this.protocol + '://' + this.get('host') + this.originalUrl; }
	}
});

function setFolderLevelRoutes() {
	return new Promise((resolve, reject) => {
		//Create a unique route for each sub-folders found in "/routes" path:
		$$$.files.dirs($$$.paths.__routes, (err, files, names) => {
			if(err) return reject(err);

			files.forEach( (fullpath, f) => {
				const name = names[f];
				const route = $$$.make.routeFromModule(fullpath + '/sv-route.js', name);

				$$$.app.use('/'+name, route);
				$$$.routes[name] = route;
			});

			trace("EXPRESS/ROUTES setup: ".yellow + "initialized.");
			resolve();
		});
	});
}

function setTopLevelRoutes() {
	return new Promise((resolve, reject) => {
		_.mapValues($$$.routes, route => {
			//Apply Page-Not-Found error for unknown routes:
			route.use('/*', (req, res) => {
				const ROUTE_NAME = route._name.toUpperCase();
				if(!req) throw new Error("Request is null!!!");
				res.status(404).send(`[${ROUTE_NAME}] Unknown request: [${req.method}] ` + req.fullURL);
			});
		})

		$$$.app.use('/$', (req, res, next) => {
			$$$.files.read($$$.paths.__vueIndex, (err, indexContent) => {
				//Swap all occurences of 'localhost:####' to the actual host this is called on:
				var actualHost = req.get('host');
				indexContent = indexContent
					.replace(/localhost:[0-9]*/g, actualHost)
					.replace(/https:\/\/ec2/g, process.env.HTTP_TYPE +'://ec2');

				res.send(indexContent);
			});
		});

		$$$.app.use('/', $$$.express.static($$$.paths.__public));
		$$$.app.use('/dist', $$$.express.static($$$.paths.__vueDist));
		$$$.app.use('/webhooks', (req, res, next) => {
			$$$.jsonLoader.loadJSON()
				.then(jsonLoader => {
					res.json({received:true, dateLoaded: jsonLoader.dateLoaded});
				})
				.catch(err => {
					$$$.send.error(res, 'Could not load JSON from webhook: ' + err);
				});
		});

		$$$.server.listen($$$.env.ini.PORT, function (err) {
			if (err) return reject(err);

			$$$.emit('server-started');

			resolve();
		});
	});
}

_.extend(setFolderLevelRoutes, {
	routes: $$$.routes,
	numRoutes: () => _.keys($$$.routes).length,
	setTopLevelRoutes: setTopLevelRoutes
});

module.exports = setFolderLevelRoutes;