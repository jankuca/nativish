var UIButton = UIUnit.inherit({
	'_setup': function () {
		var info = this.getInfo(),
			el = document.createElement('span'),
			content_el = document.createElement('span'),
			$el = $(el);
		el.appendChild(content_el);
		$el.addClass('UIButton');
		$(content_el).html(this.getInfo().label);
		if (info.type) {
			$el.addClass(info.type);
		}
		if (info.icon) {
			$el.attr('data-icon', info.icon);
		}

		if (info.menu instanceof UIMenuDialog) {
			$el.bind('click', function () {
				app.window.pushDialog(info.menu);
			}).bind('tap', function () {
				app.window.pushDialog(info.menu);
			});
		}

		if (typeof info.handler === 'function') {
			$el .bind('click', info.handler.bind(window))
				.bind('tap', info.handler.bind(window));
		}

		return el;
	},
});