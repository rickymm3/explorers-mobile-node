var Spinner = /** @class */ (function () {
    function Spinner(tag) {
        this._el = null;
        this._twn = null;
        this.isBusy = false;
        this.onStopBusy = null;
        this._el = $(tag || '#spinner');
        this._el.hide();
        TweenMax.set(this._el, { alpha: 0 });
    }
    Spinner.prototype._killTween = function () {
        if (!this._twn)
            return;
        this._twn.kill();
        this._twn = null;
    };
    Spinner.prototype.startBusy = function (spinTime, predelay, cb) {
        if (spinTime === void 0) { spinTime = 0.5; }
        if (predelay === void 0) { predelay = 0; }
        if (cb === void 0) { cb = null; }
        this.isBusy = true;
        this._killTween();
        this._el.show();
        TweenMax.to(this._el, 0.3, { alpha: 1 });
        this._twn = TweenMax.to(this._el, spinTime, { rotation: "+=360", repeat: -1, ease: Linear.easeNone });
        var _stopBusy = this.stopBusy.bind(this);
        if (cb)
            setTimeout(function () { return cb(_stopBusy); }, predelay * 1000);
    };
    Spinner.prototype.stopBusy = function () {
        this._killTween();
        TweenMax.to(this._el, 0.3, { alpha: 0 });
        this.onStopBusy && this.onStopBusy();
        this.isBusy = false;
    };
    return Spinner;
}());
