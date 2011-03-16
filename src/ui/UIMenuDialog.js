var UIMenuDialog = UIDialog.inherit(function () {
	this._buttons = [];
}, {
	'_setup': function () {
		var info = this.getInfo();

		var el = document.createElement('div');
		$(el).addClass('UIMenuDialog');

		if (info.title) {
			var title_el = document.createElement('p');
			$(title_el).html(info.title);
			el.appendChild(title_el);
		}

		var buttons_el = document.createElement('ul');
		el.appendChild(buttons_el);
		this._buttons_el = buttons_el;

		var cancel_el = document.createElement('ul');
		el.appendChild(cancel_el);
		var cancel_button = new UIButton({
			'type': 'cancel',
			'label': _('cancel'),
			'handler': function () {
				app.window.popDialog();
			}
		});
		cancel_el.appendChild(cancel_button.getElement());

		return el;
	},

	'pushButton': function (button) {
		this._buttons.push(button);
		this._buttons_el.appendChild(button.getElement());
	},
});