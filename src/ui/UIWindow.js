var UIWindow = UIUnit.inherit(function (info) {
	info = info || {};

	this._views = [];
	this._dialogs = [];
	
	if (info.navigation_bar) {
		this.navigation_bar = info.navigation_bar;
	}
}, {
	'_setup': function () {
		var el = document.createElement('div'),
			win = this;
		$(el).addClass('UIWindow').bind('touchstart', function (event) {
			event.preventDefault();
		});
		if (this.navigation_bar) {
			var nav_el = this.navigation_bar.getElement();
			el.appendChild(nav_el);
			var fn = function () {
				if (nav_el.clientHeight > 0) {
					$(views_el).addClass('views').css({
						'top': nav_el.clientHeight + 'px'
					});
				} else {
					setTimeout(fn, 100);
				}
			};
			setTimeout(fn, 100);
		}

		var views_el = document.createElement('div');
		$(views_el).css({
			'position': 'absolute',
			'top': '0px',
			'bottom': '0px'
		});
		el.appendChild(views_el);
		this._views_el = views_el;

		window.addEventListener('orientationchange', function () {
			var w = win.getWidth(),
				views = Array.prototype.slice.call(views_el.childNodes),
				i, ii = views.length;
			views_el.style.width = w * ii + 'px';
			for (i = ii - 1; i >= 0; --i) {
				views[i].style.width = w + 'px';
			}
			views_el.style.webkitTransform = 'translate3d(-' + (w * (ii - 1)) + 'px, 0, 0)';
		});

		var dialog_cover_el = document.createElement('div');
		$(dialog_cover_el).addClass('dialog_cover').css({
			'display': 'none',
			'opacity': '0'
		}).bind('tap', function () {
			win.popDialog();
		}).bind('click', function () {
			win.popDialog();
		});
		el.appendChild(dialog_cover_el);
		this._dialog_cover_el = dialog_cover_el;

		var dialogs_el = document.createElement('div');
		$(dialogs_el).css({
			'position': 'absolute',
			'left': '0px',
			'right': '0px',
			'top': '100%'
		});
		el.appendChild(dialogs_el);
		this._dialogs_el = dialogs_el;

		return el;
	},

	'getWidth': function () {
		return window.innerWidth;
	},

	'getHeight': function () {
		return window.innerHeight;
	},

	'pushView': function (view) {
		var win = this,
			el = this._views_el,
			$el = $(el),
			view_el = view.getWrapperElement();

		if (this.navigation_bar) {
			var info = view.getInfo();
			if (this._views.length > 0) {
				info.back_button = new UIBackButton({
					'label': this._views[this._views.length - 1].getInfo().title || _('back')
				});
				$(info.back_button.getElement()).bind('tap', function () {
					win.popView();
					win.navigation_bar.popState();
				});
				$(info.back_button.getElement()).bind('click', function () {
					win.popView();
					win.navigation_bar.popState();
				});
			}
			var action_button = view.getActionButton();
			if (action_button !== null) {
				info.action_button = action_button;
			}
			this.navigation_bar.pushState(info);
		}

		$(this.navigation_bar.getElement()).attr('data-view-class', view.getClassName());

		$(view_el).css({
			'position': 'absolute',
			'left': this._views.length * this.getWidth() + 'px',
			'width': this.getWidth() + 'px'
		});
		this._views.push(view);
		el.appendChild(view_el);
		$el.anim({
			'translate3d': -(this._views.length - 1) * this.getWidth() + 'px, 0, 0'
		}, 0.3);
	},

	'popView': function () {
		var el = this._views_el;
		
		this._views.pop();

		$(el).anim({
			'translate3d': -(this._views.length - 1) * this.getWidth() + 'px, 0, 0'
		}, 0.3);
		$(this.navigation_bar.getElement()).attr('data-view-class', this._views[this._views.length - 1].getClassName());
		setTimeout(function () {
			el.removeChild(el.lastChild);
		}, 300);
	},

	'replaceAllViews': function (view) {
		this._views = [];
		this.pushView(view);
	},

	'pushDialog': function (dialog) {
		var el,
			cover_el = this._dialog_cover_el;
		if (dialog instanceof UIDialog) {
			this._dialogs.push(dialog);
			el = dialog.getElement();
			$(el).css({
				'-webkit-transform': 'translate3d(0, 0, 0)'
			});
			$(cover_el).css({
				'display': 'block'
			});
			setTimeout(function () {
				$(cover_el).css({
					'opacity': '0.5'
				});
			}, 0);
			this._dialogs_el.appendChild(el);
			$(el).css({
				'-webkit-transform': 'translate3d(0, ' + (-el.clientHeight) + 'px, 0)'
			});
		}
	},

	'popDialog': function () {
		var win = this,
			index = this._dialogs.length - 1,
			cover = this._dialog_cover_el;
		if (index < 0) {
			return;
		}
		var dialog = this._dialogs[index],
			dialog_el = dialog.getElement();
		$(dialog_el).css({
			'-webkit-transform': 'translate3d(0, 0, 0)'
		});
		setTimeout(function () {
			win._dialogs_el.removeChild(dialog_el);
		}, 300);

		$(cover).css({
			'opacity': '0'
		});
		setTimeout(function () {
			$(cover).css({
				'display': 'none'
			});
		}, 300);
	},
});