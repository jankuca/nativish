var UITableView = UIView.inherit(function () {
	this._cells = [];
}, {
	'_setup': function () {
		var el = document.createElement('ul');
		$(el).addClass('UIView').addClass('UITableView');

		var count_el = document.createElement('li');
		$(count_el).html(this._cells.length).addClass('count');
		el.appendChild(count_el);
		this._count_el = count_el;

		this.getWrapperElement().appendChild(el);

		return el;
	},

	'pushCell': function (cell) {
		this.getElement().insertBefore(cell.getElement(), this._count_el);
		this._cells.push(cell);
		$(this._count_el).html(this._cells.length);
	},
});