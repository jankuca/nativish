var UIGridView = UITableView.inherit({
	'_setup': function () {
		var el = this.__super__.prototype._setup.call(this);
		$(el).removeClass('UITableView').addClass('UIGridView');

		this.getWrapperElement().appendChild(el);

		return el;
	},
});