function prepareHotReload(webdash) {
	const wp = require('webpack');
	const MemoryFS = require('memory-fs');
	const memFS = new MemoryFS();
	const wpConfig = require('../../web-dashboard/webpack.config');
	const wpCompiler = wp(wpConfig);
	const path = require('path');

	wpCompiler.outputFileSystem = memFS;

	function wpRecompile(path) {
		wpCompiler.run(done => {
			webdash.io.emit('reload', path);
		});
	}

	$$$.addWatcher('web-dashboard/**', path => {
		if(path.has('bundle.js')) {
			return trace("Bundle updated.");
		}

		traceError(path);

		wpRecompile(path);
	});

	wpRecompile();

	webdash.route.use('/dist/*', (req, res, next) => {
		var filepath = webdash.__public + req.baseUrl.replace('web-dashboard/', '');

		if(!memFS.existsSync(filepath)) {
			return res.status(404).send('Webpack resource not found in /dist: ' + filepath);
		}

		var content = memFS.readFileSync(filepath, 'utf8');
		res.send(content);
	});
}

module.exports = prepareHotReload;