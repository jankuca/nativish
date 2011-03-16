var UIBackButton = UIButton.inherit({
	'_setup': function () {
		var el = this.__super__.prototype._setup.call(this);
		$(el).addClass('UIBackButton')
			.find('span').html(this.getInfo().label);

		return el;
	},
});