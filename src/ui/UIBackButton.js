var UIBackButton = UIButton.inherit({
	'_setup': function () {
		var el = this.$super();
		$(el).addClass('UIBackButton')
			.find('span').html(this.getInfo().label);

		return el;
	},
});