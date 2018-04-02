/**
 * Created by Chamberlain on 10/30/2017.
 */
declare var TweenMax;

class Spinner {
	_el = null;
	_twn = null;
	isBusy = false;
	onStopBusy = null;

	constructor(tag) {
		this._el = $(tag || '#spinner');
		this._el.hide();
		TweenMax.set(this._el, {alpha: 0});
	}

	_killTween() {
		if(!this._twn) return;

		this._twn.kill();
		this._twn = null;
	}

	startBusy(spinTime=0.5, predelay=0, cb=null) {
		this.isBusy = true;

		this._killTween();

		this._el.show();

		TweenMax.to(this._el, 0.3, {alpha: 1});

		this._twn = TweenMax.to(this._el, spinTime, {rotation: "+=360", repeat: -1, ease: Linear.easeNone});

		var _stopBusy = this.stopBusy.bind(this);
		if(cb) setTimeout(() => cb(_stopBusy), predelay * 1000);
	}

	stopBusy() {
		this._killTween();

		TweenMax.to(this._el, 0.3, {alpha: 0});

		this.onStopBusy && this.onStopBusy();

		this.isBusy = false;
	}
}