/**
 * Created by Chamberlain on 8/11/2017.
 */
const mgHelpers = require('./sv-mongo-helpers');
const mongoose = require('mongoose');
const sendNotImplemented = $$$.send.notImplemented;
const sendEmpty = $$$.send.empty;
const MONGO_ENV = $$$.env.ini.MONGO.ENV;
const NODE_ENV = $$$.env().toUpperCase();
const CONFIG = $$$.env.ini.PRIVATE[MONGO_ENV || 'MONGO_' + NODE_ENV];

module.exports = _.extend(mongoSetup, {createMongoModels});

function mongoSetup() {
	return new Promise((resolve, reject) => {
		trace("MONGO setup: ".yellow + `initialized (Connecting using "${MONGO_ENV}").`);

		const mongoConfig = {
			config: {
				autoIndex: false,
				useMongoClient: true
			}
		};

		const mongoURL = `mongodb://${CONFIG.USER}:${CONFIG.PASS}@localhost:${CONFIG.PORT}/${CONFIG.DB}?authSource=${CONFIG.DB_ADMIN}`;
		const conn = mongoose.connect(mongoURL, mongoConfig);
		const db = mongoose.connection.db;
		conn
			.then(resolve)
			.catch(err => {
				trace("Failed to connect MongoDB with mongoURL:\n" + mongoURL);
				reject(err);
			});
		
		//Alias:
		db.getCollectionNames = db.listCollections;

		mgHelpers.plugins.autoIncrement.initialize(conn);
	});
}

function createMongoModels() {
	return new Promise((resolve, reject) => {
		$$$.models = {};

		$$$.files.forEachJS($$$.paths.__mongoSchemas, forEachModel, resolve);
	});
}

function forEachModel(schemaFile, name) {
	name = name.remove('model-').remove('.js');

	//Finally, let's create our Model, so we can instantiate and use it:
	const Model = mgHelpers.createModel(schemaFile, name);

	$$$.models[Model._nameTitled] = Model;

	function makeOptionsObj(req, options) {
		return _.extend({data: req.body}, options || {});
	}

	// Add the singular & plural form of the router
	// They each do something different for each HTTP VERB types
	const api = $$$.routes.api;
	const customRoutes = Model._def.customRoutes || {};
	const adminRoute = '/admin' + Model.__route;
	const adminRoutes = '/admin' + Model.__routes;
	const traceRoutes = Model._def.traceRoutes;

	_.keys(customRoutes).forEach(routeName => {
		var methodSplit = routeName.split('::');
		var method = 'use';
		var __route = routeName;

		if(methodSplit.length===2) {
			method = methodSplit[0].toLowerCase();
			__route = methodSplit[1];
		}

		if(__route.startsWith('/')) __route = __route.substr(1);

		const __customRoute = Model.__route + "/" + __route;
		const __adminRoute = adminRoute + "/" + __route;
		const customRouteMiddleWare = (req, res, next) => {
			customRoutes[routeName](Model, req, res, next, makeOptionsObj(req));
		};

		if(traceRoutes===true || __route.has(traceRoutes)) {
			trace("Adding route: " + method.toUpperCase() + " :: " + __route)
		}

		api[method](__customRoute, customRouteMiddleWare);
		api[method](__adminRoute, customRouteMiddleWare);
	});

	api.use(adminRoutes + "$", (req, res, next) => {
		if(!req.auth.isAdmin) return $$$.send.error(res, "Only admin can call this.");

		Model.find({})
			.then(list => {
				mgHelpers.sendFilteredResult(res, list);
			})
			.catch(err => {
				$$$.send.error(res, err.message || err);
			});
	});

	api.use(adminRoutes + '/count', (req, res, next) => {
		if(!req.auth.isAdmin) return $$$.send.error(res, "Can't count here.");

		Model.count((err, count) => {
			if(err) return $$$.send.error(res, `Could not count model '${Model._nameTitled}':\n`+err.message);
			$$$.send.result(res, {count: count});
		})
	});
}