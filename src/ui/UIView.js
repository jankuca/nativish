var UIView = UIUnit.inherit(function () {
	this._wrapper = document.createElement('div');
	$(this._wrapper).addClass('view-wrapper');

	setTimeout(function () {
		try {
			this._iscroll = new iScroll(this.getElement(), {
				'checkDOMChanges': true,
				'vScrollbar': true,
				'desktopCompatibility': true
			});
		} catch (exc) {
			// We don't care. (The view element not in the DOM tree yet)
		}
	}.bind(this), 100);
}, {
	'_setup': function () {
		var el = document.createElement('div');
		$(el).addClass('UIView');

		this.getWrapperElement().appendChild(el);

		return el;
	},

	'getWrapperElement': function () {
		return this._wrapper;
	}.

	'getClassName': function () {
		var className = 'UIView';
		this.getElement().className.split(/\s+/).forEach(function (one) {
			if (one.match(/^UI([A-Z]\w*)View$/)) {
				className = one;
			}
		});
		return className;
	},

	'getActionButton': function () {
		return this._action_button || null;
	},

	'setActionButton': function (button) {
		if (button instanceof UIButton) {
			this._action_button = button;
		}
	},
});