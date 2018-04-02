/**
 * Created by Chamberlain on 8/10/2017.
 */


const requestLimiter = require('./sv-request-limiter')();
const PRIVATE = $$$.env.ini.PRIVATE;

const ERRORS = _.mapValues({
	NOT_AUTHORIZED() {
		return "Not Authorized!";
	},
	INCORRECT_AUTHCODE() {
		return "Incorrect Authorization!";
	},
	BANNED() {
		return "Banned User!";
	},
	REQUEST_LIMIT(res) {
		return "Reached API-Request limit, please wait a while for your next request: " + res.req.ip;
	}
}, (cbError, name) => {
	const errorTitle = name.replace(/_/g, ' ');
	return res => $$$.send.errorCustom(res, cbError(res), errorTitle);
});

function isAuthorized(req) {
	const authCode64 = req.headers.authorization;
	if(!authCode64 || authCode64.trim().length===0) return ERRORS.NOT_AUTHORIZED;

	//Check if the player is authorized...
	const authCodeStr = authCode64.fromBase64();
	const authSplit = authCodeStr.split("::");
	const authCode = authSplit[0];
	const authDate = new Date().toLocaleDateString();

	// To login as Admin, the Authorization must match the AUTH_ADMIN + current date:
	const auth = req.auth = {
		codes: authSplit,
		isAdmin: authCode===PRIVATE.AUTH_ADMIN && authSplit[1]===authDate,
		isAuth: authCode===PRIVATE.AUTH_CODE,
	};

	//If not authorized at all, respond error:
	if(!auth.isAdmin && !auth.isAuth) {
		return ERRORS.INCORRECT_AUTHCODE;
	}

	auth.isAuth = true;

	return true;
}

module.exports = {
	ERRORS: ERRORS,

	getAdminLogin() {
		return _.makeToken(PRIVATE.AUTH_ADMIN, new Date().toLocaleDateString());
	},

	isAuthMiddleware(req, res, next) {
		const authOK = isAuthorized(req);

		if(!req.auth) {
			return ERRORS.NOT_AUTHORIZED(res);
		}

		if(!req.auth.isAdmin && requestLimiter.isTooMuch(req)) {
			return ERRORS.REQUEST_LIMIT(res);
		}

		if(authOK===true) return next();

		authOK(res);
	},

	authenticateUser(req, res, next) {
		const url = req.fullURL.split('/api/')[1];
		if(url.startsWith('admin/') || url.startsWith('user/public/')) {
			return next();
		}

		if(url.has('/login')) {
			return $$$.send.errorCustom(res, "Please redirect to '/user/public/login'", 'Login URL has changed.');
		}

		const USERAUTH_ERROR = err => $$$.send.errorCustom(res, err, "User Authentication Failed");

		if(!req.auth || !(req.auth.isAdmin || req.auth.isAuth)) {
			return USERAUTH_ERROR("Request missing OR has incorrect Authorization key.");
		}

		const authCodes = req.auth.codes;
		if(authCodes.length<3 && !req.auth.isAdmin) {
			return USERAUTH_ERROR("Request missing parts of Authorization to determine username & token: " + authCodes.length);
		} else if(req.auth.isAdmin) {
			return next();
		}

		const username = authCodes[1];
		const token = authCodes[2];

		$$$.models.User.findOne({username: username}).exec()
			.then( found => {
				if(!found) throw `'${username}' not found.`;
				if(!found.login.token) throw `'${username}' not logged in.`;
				if(found.login.token!==token) throw `'${username}' token doesn't match`;

				req.isUser = true;
				req.auth.user = found;

				found.login.datePing = new Date();
				return found.save();
			})
			.then( found => {
				//req.auth.user = found;

				next();
			})
			.catch( err => {
				USERAUTH_ERROR(err);
			});
	},

	configHeaders(res) {
		res.header('Access-Control-Allow-Origin','*');
		res.header('Access-Control-Allow-Credentials','true');
		res.header('content-type','application/json'); //text/plain
	}
};