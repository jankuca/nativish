var UINavigationBar = UIUnit.inherit(function () {
	this._states = [];
}, {
	'_setup': function () {
		var el = document.createElement('div');
		$(el).addClass('UINavigationBar');

		var backs_el = document.createElement('div');
		$(backs_el).addClass('backs');
		el.appendChild(backs_el);
		this._backs_el = backs_el;

		var actions_el = document.createElement('div');
		$(actions_el).addClass('actions');
		el.appendChild(actions_el);
		this._actions_el = actions_el;

		return el;
	},

	'pushState': function (state) {
		var index = this._states.push(state) - 1,
			el = this.getElement(),
			heading_el = document.createElement('h2'),
			$heading_el = $(heading_el),
			back_button = state.back_button,
			back_button_el = back_button ? back_button.getElement() : null,
			action_button = state.action_button,
			action_button_el = action_button ? action_button.getElement() : null;

		$heading_el.attr('data-state', index).html(state.title);

		if (index !== 0) {
			$heading_el.css({
				'opacity': '0',
				'-webkit-transform': 'translate3d(50%, 0, 0)'
			});
		}

		el.appendChild(heading_el);
		setTimeout(function () {
			$heading_el.css({
				'opacity': '1',
				'-webkit-transform': 'translate3d(0, 0, 0)'
			});
		}, 0);

		if (back_button) {
			$(back_button_el).attr('data-state', index).css({
				'opacity': '0',
				'-webkit-transform': 'translate3d(' + (index !== 1 ? this._backs_el.lastChild.clientWidth : 50) + 'px, 0, 0)'
			});
			this._backs_el.appendChild(back_button_el);
			setTimeout(function () {
				$(back_button_el).css({
					'display': 'block'
				}).css({
					'opacity': '1',
					'-webkit-transform': 'translate3d(0, 0, 0)'
				});
			}, 0);
		}

		if (action_button) {
			$(action_button_el).attr('data-state', index).css({
				'display': 'block',
				'opacity': '0'
			});
			this._actions_el.appendChild(action_button_el);
			$(action_button_el).css({
				'opacity': '1'
			});
		}

		if (index !== 0) {
			$('[data-state="' + (index - 1) + '"]', el).each(function () {
				if (this.tagName === 'H2') {
					$(this).css({
						'opacity': '0',
						'-webkit-transform': 'translate3d(-50%, 0, 0)'
					});
				} else if ($(this.parentNode).hasClass('backs')) {
					$(this).css({
						'opacity': '0',
						'-webkit-transform': 'translate3d(-100%, 0, 0)'
					});
				} else {
					$(this).css({
						'opacity': '0'
					});
				}
			});
		}
	},

	'popState': function () {
		var index = this._states.length - 1,
			el = this.getElement();
		
		this._states.pop();

		$('[data-state="' + index + '"]', el).each(function () {
			var that = this;
			if (this.tagName === 'H2') {
				$(this).css({
					'opacity': '0',
					'-webkit-transform': 'translate3d(50%, 0, 0)'
				});
			} else if ($(this.parentNode).hasClass('backs')) {
				$(this).css({
					'opacity': '0',
					'-webkit-transform': 'translate3d(' + (index !== 1 ? this.previousSibling.clientWidth : 50) + 'px, 0, 0)'
				});
			} else {
				$(this).css({
					'opacity': '0'
				});
			}
			setTimeout(function () {
				that.parentNode.removeChild(that);
			}, 300);
		});
		$('[data-state="' + (index - 1) + '"]', el).each(function () {
			if (this.tagName === 'H2') {
				$(this).css({
					'opacity': '1',
					'-webkit-transform': 'translate3d(0, 0, 0)'
				});
			} else if ($(this.parentNode).hasClass('backs')) {
				$(this).css({
					'display': 'block'
				}).css({
					'opacity': '1',
					'-webkit-transform': 'translate3d(0, 0, 0)'
				});
			}
		});

		setTimeout(function () {
			$('.new', el).each(function () {
				this.parentNode.removeChild(this);
			});
		}, 500);
	},
});