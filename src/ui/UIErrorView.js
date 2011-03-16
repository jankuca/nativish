var UIErrorView = UIView.inherit(function () {
	var menu = new UIMenuDialog();

	menu.pushButton(new UIButton({
		'label': _('error.report')
	}))

	this.setActionButton(new UIButton({
		'icon': 'menu',
		'menu': menu
	}));
}, {
	'_setup': function () {
		var el = document.createElement('div');
		$(el).addClass('UIView').addClass('UIErrorView').html(this.getInfo().message);

		return el;
	},
});