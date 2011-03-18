var UIGridView = UITableView.inherit({
	'_setup': function () {
		var el = this.$super();
		$(el).removeClass('UITableView').addClass('UIGridView');

		this.getWrapperElement().appendChild(el);

		return el;
	},
});