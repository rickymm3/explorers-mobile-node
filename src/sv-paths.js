/**
 * Created by Chamberlain on 8/10/2017.
 */
const path = require('path');
const __root = __dirname.__;
const __fullSplit = __root.split('/');
const paths = {};

module.exports = function(env) {
	trace("Root directory: ".yellow + __root);

	paths.__filename = __fullSplit.last();
	paths.__dir = __fullSplit.slice(0, __fullSplit.length-1).join('/');
	paths.__full = __fullSplit.join('/');
	paths.__src = paths.__dir + '/src';
	paths.__private = paths.__dir + '/.private';
	paths.__data = paths.__dir + '/.private/data';
	paths.__public = paths.__dir + '/public';
	paths.__routes = paths.__dir + '/src/routes';
	paths.__tests = paths.__dir + '/src/tests';
	paths.__vue = paths.__dir + '/vue-test';
	paths.__vueDist = paths.__dir + '/vue-test/dist';
	paths.__vueIndex = paths.__dir + '/vue-test/index.html';
	paths.__mongoSchemas = paths.__dir + '/src/models';
	paths.__api = `${process.env.HTTP_TYPE}://localhost:${env.ini.PORT}/api`;

	return paths;
}

