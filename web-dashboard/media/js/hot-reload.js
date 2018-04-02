/**
 * Created by Chamberlain on 10/30/2017.
 */

const HotReload = {
	reloadStylesheets() {
		var queryString = '?reload=' + new Date().getTime();
		$('link[rel="stylesheet"][hot-reload]').each(function () {
			this.href = this.href.replace(/\?.*|$/, queryString);
		});
	},

	reload(data) {
		if(data) {
			if(data.has('.less')) return;
			if(data.has('.css')) return HotReload.reloadStylesheets();
		}

		setTimeout(() => {
			console.clear && console.clear();
			window.location.reload(true);
		}, 400);
	}
};

export default HotReload;