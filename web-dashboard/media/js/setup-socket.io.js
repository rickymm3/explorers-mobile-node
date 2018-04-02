var trace = window.trace.makeLogger('SOCKET-IO', '#f4a');

import HotReload from './hot-reload';

trace("Initialize");

$$$.io = io('/web-dashboard');

$$$.io.on('reload', HotReload.reload);
$$$.io.on('disconnect', function() {
	trace("Reconnecting...");
	$$$.io.once('connect', HotReload.reload);
});

$$$.io.on('job-published', job => {
	var found = $$$.vue.cronJobs.find(j => j.id == job.id);
	if(!found) return; // traceError("Could not find matching job!");

	var jobClass = '.job-' + job.id;
	TweenMax.from(jobClass, 0.4, {css: {textShadow: '1px 1px 1px #fff'}, ease: Sine.easeIn});

	if($$$.vue.currentJob===found) {
		_.merge(found.published, job.published);
		TweenMax.from("#publish-led", 0.4, {className: '+=is-published', ease: Sine.easeIn});
		TweenMax.fromTo("#publish-led .fa-circle-o", 0.4, {scale: 0.5, alpha: 1}, {scale: 1.2, alpha: 0, ease: Linear.easeNone});
	}
});