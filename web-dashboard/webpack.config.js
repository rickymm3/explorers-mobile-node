// vendor-bundles.webpack.config.js
const webpack = require('webpack');
const path = require('path');

module.exports = {
	entry: path.resolve(__dirname, "./media/js/main.js"),

	output: {
		path: path.resolve(__dirname, "./dist"),
		filename: "bundle.js"
	},

	devServer: {
		publicPath: "/public",
		contentBase: "./web-dashboard",
		hot: false,
		inline: false
	},

	module: {
		loaders: [
			{ test: /\.css$/, loader: "style!css" }
		]
	}
};