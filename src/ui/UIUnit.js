var UIUnit = Function.inherit(function (info) {
	this._info = info || {};
	if (typeof this._setup === 'function') {
		var el = this._element = this._setup();
		if (info['class'] instanceof Array) {
			info['class'].forEach(function (className) {
				el.addClass(className);
			});
		} else if (typeof info['class'] === 'string') {
			el.addClass(info['class']);
		}
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

UIUnit.inherit = function (init, props) {
	return Function.inherit.call(this, init, props, true);
};