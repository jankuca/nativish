var UIUnit = Function.inherit(function (info) {
	this._info = info || {};
	if (typeof this._setup === 'function') {
		this._element = this._setup();
		this._element.component = this;
	}
}, {
	'getInfo': function (key) {
		return key ? this._info[key] || null : this._info;
	},

	'getElement': function () {
		return this._element || null;
	},

	'live': function (selector, event, listener) {
		$(this.getElement()).delegate(selector, event, function (event) {
			listener(event.target.component);
		});
	},

	'die': function (selector, event) {
		$(this.getElement()).undelegate(selector, event);
	},
});