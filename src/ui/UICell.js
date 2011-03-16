var UICell = UIUnit.inherit({
	'_setup': function () {
		var el = document.createElement('li');
		$(el).addClass('UICell').html(this.getInfo().label);

		return el;
	},
});