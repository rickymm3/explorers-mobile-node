/**
 * Created by Chamberlain on 8/10/2017.
 */

const auth = require('./sv-auth');
const cors = require('cors');

module.exports = function(route) {
	route.use(cors());

	PUBLIC_ROUTES();

	route.use('/*', auth.isAuthMiddleware);

	SECURE_ROUTES();

	//Ok all other routes beyond this point requires USER-AUTHENTICATED TOKENS!!!
	route.use('/*', auth.authenticateUser);

	route.use('/*', (err, req, res, next) => {
		var msg = err.message || err;
		traceError("API ERROR." + msg);
		trace(err);

		res.status(500).send({error: 'Could not get data at this URL.'})
	});

	////////////////////////////////////////////////////////////////////////////////////////////////

	function PUBLIC_ROUTES() {
		route.use('/*', (req, res, next) => {
			//This sets cross-origin / verbs allowed to call:
			auth.configHeaders(res);
			next();
		});

		route.get('/test', (req, res) => {
			$$$.send.result(res, "Test OK.");
		});

		route.get('/test-banned', (req, res) => {
			auth.ERRORS.BANNED(res);
		});
	}

	function SECURE_ROUTES() {
		route.use('/test-echo', (req, res) => {
			res.send({test:1, echo: req.body});
		});

		// authorizedRoute.get('/users', (req, res, next) => {
		// 	trace("Users (many)...");
		// 	next();
		// });
		//
		// authorizedRoute.get('/user', (req, res, next) => {
		// 	trace("User (single)...");
		// 	next();
		// });
	}
};